import { z } from "zod"

// One source of truth for the auth forms (7.2). The backend enforces the same password
// rules (`backend/src/modules/auth/auth.schema.ts`), so a client pass is a server pass.

const email = z.email({ error: "Enter a valid email" }).trim().toLowerCase()

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

/** Login does not re-check password strength: an old password may predate the rules. */
export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Enter your password" }),
})

export type RegisterValues = z.output<typeof registerSchema>
export type LoginValues = z.output<typeof loginSchema>
