import { z } from "zod"

const email = z.email().trim().toLowerCase()
const password = z
  .string()
  .min(8, "At least 8 characters")
  .max(72, "At most 72 characters")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/\d/, "Add a number")

export const registerSchema = {
  body: z.object({ name: z.string().trim().min(2).max(80), email, password }),
}
export const loginSchema = {
  body: z.object({ email, password: z.string().min(1) }),
}
export const verifyEmailSchema = { body: z.object({ token: z.string().min(10) }) }
export const forgotPasswordSchema = { body: z.object({ email }) }
export const resetPasswordSchema = {
  body: z.object({ token: z.string().min(10), password }),
}
export const changePasswordSchema = {
  body: z.object({ currentPassword: z.string().min(1), newPassword: password }),
}
