import { ApiError } from "../../utils/ApiError.js"
import { User, type UserDoc } from "../users/user.model.js"
import { RefreshToken } from "./refreshToken.model.js"
import type { GoogleProfile } from "./google.js"

export type GoogleOutcome = { user: UserDoc; created: boolean; linked: boolean }

/**
 * Account linking rules (the security-sensitive part of social login):
 *  1. A known Google `sub` signs straight in.
 *  2. Otherwise the email decides: an existing account is LINKED only if Google vouches for the
 *     email (`email_verified`). An unverified Google email is refused (otherwise anyone could
 *     claim someone else's account by registering that address at Google-like providers).
 *  3. If the existing local account never verified its email, whoever registered it may be an
 *     attacker who knows its password ("pre-hijacking"). So linking drops that password and
 *     every session: from now on only the real mailbox owner (via Google or Forgot password)
 *     gets in.
 *  4. No account: create one (verified, no password).
 */
export async function signInWithGoogle(profile: GoogleProfile): Promise<GoogleOutcome> {
  if (!profile.emailVerified)
    throw new ApiError(
      403,
      "EMAIL_NOT_VERIFIED",
      "Google has not verified this email address"
    )

  const byGoogle = await User.findOne({ googleId: profile.sub })
  if (byGoogle) return { user: assertActive(byGoogle), created: false, linked: false }

  const existing = await User.findOne({ email: profile.email }).select("+passwordHash")
  if (existing) {
    assertActive(existing)
    if (!existing.emailVerified && existing.passwordHash) {
      existing.passwordHash = undefined
      existing.authProviders = existing.authProviders.filter((p) => p !== "password")
      await RefreshToken.updateMany(
        { user: existing._id, revokedAt: null },
        { revokedAt: new Date() }
      )
    }
    existing.googleId = profile.sub
    if (!existing.authProviders.includes("google")) existing.authProviders.push("google")
    existing.emailVerified = true
    existing.avatarUrl ??= profile.picture
    existing.lastLoginAt = new Date()
    await existing.save()
    return { user: existing, created: false, linked: true }
  }

  const user = await User.create({
    name: profile.name.slice(0, 80),
    email: profile.email,
    googleId: profile.sub,
    authProviders: ["google"],
    emailVerified: true,
    avatarUrl: profile.picture,
    lastLoginAt: new Date(),
  })
  return { user, created: true, linked: false }
}

function assertActive(user: UserDoc) {
  if (!user.isActive)
    throw new ApiError(403, "ACCOUNT_DISABLED", "This account has been disabled")
  return user
}
