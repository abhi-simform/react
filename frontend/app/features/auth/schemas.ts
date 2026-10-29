import { z } from "@/lib/zod"

// One source of truth for the auth forms (7.2). The backend enforces the same password
// rules (`backend/src/modules/auth/auth.schema.ts`), so a client pass is a server pass.

// Trim and lower-case BEFORE validating: z.email().trim() checked the padded string first,
// so a pasted " me@x.com " failed with "Enter a valid email" (found by a test, 12.1).
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email" }))

export const passwordField = z
  .string()
  .min(8, { error: "At least 8 characters" })
  .max(72, { error: "At most 72 characters" })
  .regex(/[a-z]/, { error: "Add a lowercase letter" })
  .regex(/[A-Z]/, { error: "Add an uppercase letter" })
  .regex(/[0-9]/, { error: "Add a number" })

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, { error: "Enter your full name" }),
    email,
    password: passwordField,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { error: "You must accept the terms" }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"], // attach the error to THIS field, not to the whole form
    error: "Passwords do not match",
  })

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z
  .object({ password: passwordField, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    error: "Passwords do not match",
  })

/** Login does not re-check password strength: an old password may predate the rules. */
export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Enter your password" }),
})

export type ResetPasswordValues = z.output<typeof resetPasswordSchema>
export type ForgotPasswordValues = z.output<typeof forgotPasswordSchema>
export type RegisterValues = z.output<typeof registerSchema>
export type LoginValues = z.output<typeof loginSchema>
