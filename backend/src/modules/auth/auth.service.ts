import bcrypt from "bcryptjs"
import crypto from "node:crypto"
import { env } from "../../config/env.js"
import { signAccessToken } from "../../middleware/auth.js"
import { ApiError } from "../../utils/ApiError.js"
import { sendEmail } from "../../utils/email.js"
import { generateToken, hashToken } from "../../utils/tokens.js"
import { User, toPublicUser, type UserDoc } from "../users/user.model.js"
import { RefreshToken } from "./refreshToken.model.js"

const BCRYPT_ROUNDS = 12
const DAY = 24 * 60 * 60 * 1000
// Compared against when the email doesn't exist so response time doesn't reveal valid emails.
const DUMMY_HASH = bcrypt.hashSync("dummy-password", 4)

interface ClientInfo {
  userAgent?: string
  ip?: string
}

export async function issueSession(
  user: UserDoc,
  client: ClientInfo,
  family: string = crypto.randomUUID(),
  startedAt: Date = new Date()
) {
  const { token, hash } = generateToken(48)
  await RefreshToken.create({
    user: user._id,
    tokenHash: hash,
    family,
    startedAt,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY),
    userAgent: client.userAgent,
    ip: client.ip,
  })
  return {
    user: toPublicUser(user),
    accessToken: signAccessToken({ sub: user.id, role: user.role }),
    refreshToken: token,
  }
}

const RESEND_COOLDOWN_MS = 60_000

async function sendVerificationEmail(user: UserDoc) {
  const { token, hash } = generateToken()
  user.emailVerifyTokenHash = hash
  user.emailVerifyExpires = new Date(Date.now() + DAY)
  user.emailVerifySentAt = new Date()
  await user.save()
  const link = `${env.CLIENT_URL}/verify-email?token=${token}`
  await sendEmail(
    user.email,
    "Verify your ShopSphere email",
    `<p>Hi ${user.name},</p><p><a href="${link}">Verify your email</a> (valid for 24 hours).</p><p>${link}</p>`
  )
}

export async function register(
  input: { name: string; email: string; password: string },
  client: ClientInfo
) {
  if (await User.exists({ email: input.email })) {
    throw ApiError.conflict("An account with this email already exists", "EMAIL_TAKEN")
  }
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
  })
  await sendVerificationEmail(user)
  return issueSession(user, client)
}

export async function login(
  input: { email: string; password: string },
  client: ClientInfo
) {
  const user = await User.findOne({ email: input.email }).select("+passwordHash")
  const match = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !match)
    throw ApiError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS")
  if (!user.isActive) throw ApiError.forbidden("This account has been disabled")
  user.lastLoginAt = new Date()
  await user.save()
  return issueSession(user, client)
}

export async function refresh(rawToken: string | undefined, client: ClientInfo) {
  if (!rawToken) throw ApiError.unauthorized("Missing refresh token", "NO_REFRESH_TOKEN")
  const stored = await RefreshToken.findOne({ tokenHash: hashToken(rawToken) })
  if (!stored)
    throw ApiError.unauthorized("Invalid refresh token", "INVALID_REFRESH_TOKEN")

  if (stored.revokedAt) {
    // Reuse of a rotated token => assume theft, kill every session in this family.
    await RefreshToken.updateMany(
      { family: stored.family, revokedAt: null },
      { revokedAt: new Date() }
    )
    throw ApiError.unauthorized("Refresh token reuse detected", "REFRESH_REUSE")
  }
  if (stored.expiresAt < new Date())
    throw ApiError.unauthorized("Session expired", "SESSION_EXPIRED")

  const user = await User.findById(stored.user)
  if (!user || !user.isActive) throw ApiError.unauthorized("Account unavailable")

  stored.revokedAt = new Date()
  await stored.save()
  return issueSession(user, client, stored.family, stored.startedAt)
}

export async function logout(rawToken: string | undefined) {
  if (!rawToken) return
  const stored = await RefreshToken.findOne({ tokenHash: hashToken(rawToken) })
  if (stored)
    await RefreshToken.updateMany(
      { family: stored.family, revokedAt: null },
      { revokedAt: new Date() }
    )
}

/**
 * Distinguishes the three outcomes the verify page needs: success, expired (offer a resend),
 * invalid. The hash is KEPT after use so a second click can say "already verified" instead of
 * "invalid"; it is cleared by the next resend. Verifying twice never changes anything.
 */
export async function verifyEmail(token: string) {
  const user = await User.findOne({ emailVerifyTokenHash: hashToken(token) }).select(
    "+emailVerifyTokenHash +emailVerifyExpires"
  )
  if (!user) throw new ApiError(400, "INVALID_TOKEN", "Verification link is invalid")
  if (user.emailVerified) return { alreadyVerified: true }
  if (!user.emailVerifyExpires || user.emailVerifyExpires < new Date())
    throw new ApiError(400, "TOKEN_EXPIRED", "Verification link has expired")
  user.emailVerified = true
  await user.save()
  return { alreadyVerified: false }
}

export async function resendVerification(userId: string) {
  const user = await User.findById(userId).select("+emailVerifySentAt")
  if (!user) throw ApiError.notFound("User not found")
  if (user.emailVerified)
    throw ApiError.conflict("Email is already verified", "ALREADY_VERIFIED")
  const wait = (user.emailVerifySentAt?.getTime() ?? 0) + RESEND_COOLDOWN_MS - Date.now()
  if (wait > 0)
    throw new ApiError(
      429,
      "RESEND_COOLDOWN",
      `Wait ${Math.ceil(wait / 1000)} seconds before requesting another email`,
      { retryAfterSeconds: Math.ceil(wait / 1000) }
    )
  await sendVerificationEmail(user)
}

// Always resolves the same way so attackers can't discover which emails are registered.
export async function forgotPassword(email: string) {
  const user = await User.findOne({ email })
  if (!user) return
  const { token, hash } = generateToken()
  user.passwordResetTokenHash = hash
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000)
  await user.save()
  const link = `${env.CLIENT_URL}/reset-password?token=${token}`
  await sendEmail(
    user.email,
    "Reset your ShopSphere password",
    `<p>Hi ${user.name},</p><p><a href="${link}">Reset your password</a> (valid for 1 hour).</p><p>${link}</p>`
  )
}

export async function resetPassword(token: string, password: string) {
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(token),
  }).select("+passwordResetTokenHash +passwordResetExpires")
  if (!user)
    throw new ApiError(400, "INVALID_TOKEN", "Reset link is invalid or was already used")
  if (!user.passwordResetExpires || user.passwordResetExpires < new Date())
    throw new ApiError(400, "TOKEN_EXPIRED", "Reset link has expired")
  user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  if (!user.authProviders.includes("password")) user.authProviders.push("password")
  user.emailVerified = true // they just proved they control the mailbox
  user.passwordResetTokenHash = undefined
  user.passwordResetExpires = undefined
  await user.save()
  await revokeAllSessions(user.id) // sign out everywhere
}

/** Revoke every active session of a user, optionally keeping one (by session id = family). */
async function revokeAllSessions(userId: string, exceptFamily?: string) {
  await RefreshToken.updateMany(
    {
      user: userId,
      revokedAt: null,
      ...(exceptFamily ? { family: { $ne: exceptFamily } } : {}),
    },
    { revokedAt: new Date() }
  )
}

async function familyOf(rawToken: string | undefined) {
  if (!rawToken) return undefined
  return (await RefreshToken.findOne({ tokenHash: hashToken(rawToken) }))?.family
}

/** Ends the OTHER sessions and keeps this one (identified by its refresh cookie). */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  rawRefreshToken?: string
) {
  const user = await User.findById(userId).select("+passwordHash")
  if (user && !user.passwordHash)
    throw ApiError.conflict(
      "This account signs in with Google and has no password yet. Use 'Forgot password' to create one.",
      "NO_PASSWORD"
    )
  if (
    !user?.passwordHash ||
    !(await bcrypt.compare(currentPassword, user.passwordHash))
  ) {
    throw ApiError.unauthorized("Current password is incorrect", "INVALID_CREDENTIALS")
  }
  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  await user.save()
  await revokeAllSessions(userId, await familyOf(rawRefreshToken))
}

// ---- Sessions (B10) -----------------------------------------------------------------
// One session = one refresh-token FAMILY (a login and all its rotations). Its single
// un-revoked, un-expired token is the "head": that row carries the latest device info.

/** "Chrome on macOS": enough for a human to recognise a device; not a full UA parser. */
export function describeDevice(userAgent?: string | null) {
  const ua = userAgent ?? ""
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : /curl|node|undici|supertest/i.test(ua)
              ? "API client"
              : "Unknown browser"
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad|iOS/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "unknown OS"
  return `${browser} on ${os}`
}

export async function listSessions(userId: string, rawRefreshToken?: string) {
  const currentFamily = await familyOf(rawRefreshToken)
  const heads = await RefreshToken.find({
    user: userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 })
  return heads.map((t) => ({
    id: t.family,
    device: describeDevice(t.userAgent),
    userAgent: t.userAgent ?? null,
    ip: t.ip ?? null,
    startedAt: t.startedAt,
    lastActiveAt: t.createdAt, // the head token was minted at the last refresh
    current: t.family === currentFamily,
  }))
}

export async function revokeSession(
  userId: string,
  sessionId: string,
  rawRefreshToken?: string
) {
  const res = await RefreshToken.updateMany(
    { user: userId, family: sessionId, revokedAt: null },
    { revokedAt: new Date() }
  )
  if (res.modifiedCount === 0) throw ApiError.notFound("Session not found")
  return { current: sessionId === (await familyOf(rawRefreshToken)) }
}

/** "Log out of all devices" (including this one). */
export async function logoutAll(userId: string) {
  await revokeAllSessions(userId)
}
