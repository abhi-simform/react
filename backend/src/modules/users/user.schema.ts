import { z } from "zod"

export const updateProfileSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(80).optional(),
    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")
      .optional(),
    avatarUrl: z.url().optional(),
  }),
}
