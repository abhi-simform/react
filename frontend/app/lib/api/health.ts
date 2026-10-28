import { z } from "zod"

import { api } from "./client"

const healthSchema = z.object({
  status: z.string(),
  db: z.string(),
  uptime: z.number(),
  time: z.string(),
})

export type Health = z.infer<typeof healthSchema>

/** `GET /health`. `signal` passes straight through to fetch (RequestInit). */
export const getHealth = (signal?: AbortSignal): Promise<Health> =>
  api("/health", { schema: healthSchema, signal })
