import { z } from "zod"

import { api, configureApi } from "@/lib/api/client"

import type { AuthUser, Role } from "./types"

/**
 * TEMPORARY real-token plumbing for Stage 6 (Stage 10 replaces this file with the real
 * login/register forms; the shape stays). The stub login still talks to the REAL API:
 * it signs in as the seeded dev account of the chosen role, keeps the access token
 * IN MEMORY (a module variable, never localStorage), and restores it after a page
 * refresh through `POST /auth/refresh` and the httpOnly refresh cookie. That is
 * exactly the flow Stage 10 needs, so protected B2 endpoints work now.
 */
const DEV_PASSWORD = "Password123" // seeded by `npm run seed`; dev data only
const devEmail = (role: Role) => `${role}@shopsphere.dev`

const authResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.enum(["customer", "seller", "admin"]),
  }),
  accessToken: z.string(),
})

let accessToken: string | null = null
export const getAccessToken = () => accessToken

function adopt(response: z.infer<typeof authResponseSchema>): AuthUser {
  accessToken = response.accessToken
  const { id, name, email, role } = response.user
  return { id, name, email, role }
}

export async function loginAsDevRole(role: Role): Promise<AuthUser> {
  return adopt(
    await api("/auth/login", {
      method: "POST",
      body: { email: devEmail(role), password: DEV_PASSWORD },
      schema: authResponseSchema,
    })
  )
}

/**
 * Refresh TOKEN ROTATION means each call invalidates the cookie it used: two refreshes
 * in parallel would make the second one look like a stolen, replayed token and the
 * backend would revoke the whole session. So callers share ONE in-flight request
 * (React StrictMode mounts effects twice in dev, which triggers exactly this).
 */
let inFlight: Promise<AuthUser> | null = null
export function refreshSession(): Promise<AuthUser> {
  inFlight ??= api("/auth/refresh", {
    method: "POST",
    schema: authResponseSchema,
  })
    .then(adopt)
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

export async function endSession(): Promise<void> {
  accessToken = null
  // Best effort: the local session is gone either way.
  await api("/auth/logout", { method: "POST" }).catch(() => undefined)
}

// ---- 401 handling: refresh once, tell the UI when the session is really over ----

type Listener = () => void
const lostListeners = new Set<Listener>()
export function onSessionLost(listener: Listener): () => void {
  lostListeners.add(listener)
  return () => lostListeners.delete(listener)
}

configureApi({
  getAccessToken,
  onUnauthorized: async () => {
    try {
      await refreshSession()
      return true // new token in memory: the client retries once
    } catch {
      accessToken = null
      lostListeners.forEach((l) => l())
      return false
    }
  },
})
