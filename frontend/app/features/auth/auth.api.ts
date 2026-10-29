import { z } from "@/lib/zod"

import { api } from "@/lib/api/client"
import { env } from "@/lib/env"

import { userSchema } from "./session"

const messageSchema = z.object({ message: z.string() })

export const verifyEmail = (token: string) =>
  api("/auth/verify-email", {
    method: "POST",
    body: { token },
    schema: messageSchema.extend({ alreadyVerified: z.boolean() }),
  })

export const resendVerification = () =>
  api("/auth/resend-verification", {
    method: "POST",
    auth: true,
    schema: messageSchema,
  })

/** Same answer for registered and unknown emails: the UI must not tell them apart either. */
export const forgotPassword = (email: string) =>
  api("/auth/forgot-password", {
    method: "POST",
    body: { email },
    schema: messageSchema,
  })

export const resetPassword = (input: { token: string; password: string }) =>
  api("/auth/reset-password", {
    method: "POST",
    body: input,
    schema: messageSchema,
  })

/** Fresh copy of the signed-in user (e.g. after verifying the email). */
export const getMe = () => api("/users/me", { auth: true, schema: userSchema })

/**
 * Google sign-in is a NAVIGATION, not a fetch: the browser leaves for the API, then Google,
 * then comes back to /auth/google/callback with the refresh cookie already set.
 */
export const googleSignInUrl = (from: string) =>
  `${env.VITE_API_URL}/auth/google?redirect=${encodeURIComponent(from)}`
