import { z } from "@/lib/zod"

import { api, configureApi } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"

import type { AuthUser } from "./types"

/**
 * The token model (10.1). Two tokens, two homes:
 * - ACCESS token (JWT, 15 min): a module variable below. Not in localStorage, not in a cookie:
 *   a script injected by XSS cannot read it from storage (it could still USE the page while
 *   it is open, which is why 10.9 matters). Gone on reload; restored by the refresh call.
 * - REFRESH token: an httpOnly cookie set by the API (path /api/v1/auth). JavaScript never
 *   sees it; the browser sends it only to /auth/* when we ask with `credentials: "include"`.
 *   The server ROTATES it on every use and revokes the whole session family if an old one
 *   is replayed (reuse detection).
 */
export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["customer", "seller", "admin"]),
  emailVerified: z.boolean(),
  providers: z.array(z.enum(["password", "google"])),
  avatarUrl: z.string().nullable(),
})
const authResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
})

let accessToken: string | null = null
export const getAccessToken = () => accessToken
export function clearAccessToken(): void {
  accessToken = null
}

/** DEV LAB ONLY (/dev/auth): make the in-memory token invalid, as if it had expired. */
export function devBreakAccessToken(): void {
  if (import.meta.env.DEV && accessToken) accessToken = accessToken + "x"
}

// Dev only, like `window.queryClient`: lets the console expire the token (`__devBreakToken()`).
if (import.meta.env.DEV && typeof window !== "undefined")
  (window as unknown as { __devBreakToken: () => void }).__devBreakToken =
    devBreakAccessToken

/** Payload of the JWT (readable by anyone: it is signed, not secret). `null` if malformed. */
export function accessTokenExpiresAt(): number | null {
  if (!accessToken) return null
  try {
    const payload = accessToken.split(".")[1] ?? ""
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    const { exp } = JSON.parse(json) as { exp?: unknown }
    return typeof exp === "number" ? exp * 1000 : null
  } catch {
    return null
  }
}

function adopt(response: z.infer<typeof authResponseSchema>): AuthUser {
  accessToken = response.accessToken
  return response.user
}

export async function loginWithPassword(credentials: {
  email: string
  password: string
}): Promise<AuthUser> {
  return adopt(
    await api("/auth/login", {
      method: "POST",
      body: credentials,
      schema: authResponseSchema,
    })
  )
}

/** `POST /auth/register` creates the account AND signs it in (and mails the verify link). */
export async function registerAccount(input: {
  name: string
  email: string
  password: string
}): Promise<AuthUser> {
  return adopt(
    await api("/auth/register", {
      method: "POST",
      body: input,
      schema: authResponseSchema,
    })
  )
}

/**
 * Refresh-token ROTATION means each call invalidates the cookie it used: two refreshes with
 * the same cookie look like a stolen, replayed token and the backend revokes the whole
 * session. Two layers of dedupe:
 * 1. inside this tab: everybody awaits ONE shared promise (StrictMode's double effect, six
 *    parallel 401s);
 * 2. across tabs: a Web Lock serialises refreshes, so tab B's refresh starts after tab A's
 *    finished and already carries the NEW cookie (the cookie jar is shared).
 */
let inFlight: Promise<AuthUser> | null = null
export function refreshSession(): Promise<AuthUser> {
  const run = () =>
    api("/auth/refresh", { method: "POST", schema: authResponseSchema }).then(
      adopt
    )
  inFlight ??= (
    typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request("shopsphere-refresh", run)
      : run()
  ).finally(() => {
    inFlight = null
  })
  return inFlight
}

/** Best effort: the local session is gone either way; the server clears the cookie. */
export async function endSession(): Promise<void> {
  accessToken = null
  await api("/auth/logout", { method: "POST" }).catch(() => undefined)
}

// ---- 401 handling: refresh once, tell the UI when the session is really over ----

type Listener = () => void
const lostListeners = new Set<Listener>()
export function onSessionLost(listener: Listener): () => void {
  lostListeners.add(listener)
  return () => lostListeners.delete(listener)
}
export function notifySessionLost(): void {
  accessToken = null
  lostListeners.forEach((l) => l())
}

/**
 * The token whose refresh just failed with 401. Requests that were in flight with that same
 * token fail one by one AFTER the first handler already declared the session dead: without this
 * they would each fire another (doomed) refresh.
 */
let deadToken: string | null = null

configureApi({
  getAccessToken,
  onUnauthorized: async (_error, { token }) => {
    // Another request already refreshed while this one was in flight: just retry with the new token.
    if (accessToken && accessToken !== token) return true
    if (token !== null && token === deadToken) return false
    try {
      await refreshSession()
      return true // new token in memory: the client retries once
    } catch (error) {
      // 401 from /auth/refresh = the session is dead (cookie missing, revoked, reused).
      // A network error is NOT that: stay signed in and let the caller see the failure.
      if (error instanceof ApiError && error.status === 401) {
        deadToken = token
        notifySessionLost()
      }
      return false
    }
  },
})
