import { z } from "@/lib/zod"

import { api } from "@/lib/api/client"
import { phoneField } from "@/lib/fields"

/** `GET/PATCH /users/me` (B0). */
export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["customer", "seller", "admin"]),
  phone: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  emailVerified: z.boolean(),
  createdAt: z.iso.datetime(),
})
export type Profile = z.infer<typeof profileSchema>

/** The profile form: name required, phone optional (empty = none). */
export const profileFormSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter your full name" }).max(80),
  phone: z
    .union([z.literal(""), phoneField])
    .transform((v) => (v === "" ? undefined : v)),
})
export type ProfileFormInput = z.input<typeof profileFormSchema>
export type ProfileFormOutput = z.output<typeof profileFormSchema>

export const getProfile = (signal?: AbortSignal): Promise<Profile> =>
  api("/users/me", { schema: profileSchema, auth: true, signal })

export const updateProfile = (
  input: Partial<{ name: string; phone: string; avatarUrl: string }>
): Promise<Profile> =>
  api("/users/me", {
    method: "PATCH",
    body: input,
    schema: profileSchema,
    auth: true,
  })
