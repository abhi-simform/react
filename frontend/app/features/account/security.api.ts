import { z } from "@/lib/zod"

import { api } from "@/lib/api/client"

/** `GET /auth/sessions` (B10). `id` is the refresh-token family: it survives rotation. */
export const sessionSchema = z.object({
  id: z.string(),
  device: z.string(),
  ip: z.string().nullable(),
  startedAt: z.iso.datetime(),
  lastActiveAt: z.iso.datetime(),
  current: z.boolean(),
})
export type SessionInfo = z.infer<typeof sessionSchema>

export const getSessions = (signal?: AbortSignal): Promise<SessionInfo[]> =>
  api("/auth/sessions", { schema: z.array(sessionSchema), auth: true, signal })

export const revokeSession = (id: string): Promise<void> =>
  api(`/auth/sessions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    auth: true,
  })

export const logoutAllDevices = (): Promise<void> =>
  api("/auth/logout-all", { method: "POST", auth: true })

export const changePassword = (input: {
  currentPassword: string
  newPassword: string
}) =>
  api("/auth/change-password", {
    method: "POST",
    body: input,
    auth: true,
    schema: z.object({ message: z.string() }),
  })
