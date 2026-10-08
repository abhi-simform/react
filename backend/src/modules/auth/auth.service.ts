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

async function issueSession(
  user: UserDoc,
  client: ClientInfo,
  family: string = crypto.randomUUID()
) {
  const { token, hash } = generateToken(48)
  await RefreshToken.create({
    user: user._id,
    tokenHash: hash,
    family,
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

async function sendVerificationEmail(user: UserDoc) {
  const { token, hash } = generateToken()
  user.emailVerifyTokenHash = hash
  user.emailVerifyExpires = new Date(Date.now() + DAY)
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
  return issueSession(user, client, stored.family)
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

export async function verifyEmail(token: string) {
  const user = await User.findOne({
    emailVerifyTokenHash: hashToken(token),
    emailVerifyExpires: { $gt: new Date() },
  }).select("+emailVerifyTokenHash +emailVerifyExpires")
  if (!user) throw ApiError.badRequest("Verification link is invalid or has expired")
  user.emailVerified = true
  user.emailVerifyTokenHash = undefined
  user.emailVerifyExpires = undefined
  await user.save()
}

export async function resendVerification(userId: string) {
  const user = await User.findById(userId)
  if (!user) throw ApiError.notFound("User not found")
  if (user.emailVerified)
    throw ApiError.conflict("Email is already verified", "ALREADY_VERIFIED")
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
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetTokenHash +passwordResetExpires")
  if (!user) throw ApiError.badRequest("Reset link is invalid or has expired")
  user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  user.passwordResetTokenHash = undefined
  user.passwordResetExpires = undefined
  await user.save()
  await RefreshToken.updateMany(
    { user: user._id, revokedAt: null },
    { revokedAt: new Date() }
  ) // sign out everywhere
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await User.findById(userId).select("+passwordHash")
  if (
    !user?.passwordHash ||
    !(await bcrypt.compare(currentPassword, user.passwordHash))
  ) {
    throw ApiError.unauthorized("Current password is incorrect", "INVALID_CREDENTIALS")
  }
  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  await user.save()
  await RefreshToken.updateMany(
    { user: user._id, revokedAt: null },
    { revokedAt: new Date() }
  )
}
