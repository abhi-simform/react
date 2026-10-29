import { api, configureApi } from "@/lib/api/client"

// Token model (copied in spirit from /frontend Stage 10): the ACCESS token lives in a module
// variable (not localStorage: XSS cannot read storage; gone on reload), the REFRESH token is an
// httpOnly cookie the browser sends only to /auth/*. Reload = one POST /auth/refresh restores it.

export type Role = "customer" | "seller" | "admin"
export type SessionUser = {
  id: string
  name: string
  email: string
  role: Role
}
type AuthResponse = { user: SessionUser; accessToken: string }

let accessToken: string | null = null
let user: SessionUser | null = null
let restored = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const getAccessToken = () => accessToken
export const getUser = () => user
export const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => void listeners.delete(l)
}

function adopt(r: AuthResponse) {
  accessToken = r.accessToken
  user = {
    id: r.user.id,
    name: r.user.name,
    email: r.user.email,
    role: r.user.role,
  }
  restored = true
  emit()
  return user
}
function clear() {
  accessToken = null
  user = null
  restored = true
  emit()
}

// Single-flight: the backend ROTATES the refresh token on every use and treats a replayed one as
// theft (it revokes the session). Two parallel refreshes would trip that, so everyone shares one.
let inflight: Promise<boolean> | null = null
export function refresh(): Promise<boolean> {
  inflight ??= api<AuthResponse>("/auth/refresh", { method: "POST" })
    .then((r) => (adopt(r), true))
    .catch(() => (clear(), false))
    .finally(() => void (inflight = null))
  return inflight
}

/** Called by the route guard: restores the session on a fresh page load, once. */
export async function ensureSession(): Promise<SessionUser | null> {
  if (!restored) await refresh()
  return user
}

export async function login(email: string, password: string) {
  return adopt(
    await api<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    })
  )
}

export async function logout() {
  try {
    await api("/auth/logout", { method: "POST" })
  } finally {
    clear()
  }
}

let onSessionLost: (() => void) | undefined
export const setSessionLostHandler = (fn: () => void) =>
  void (onSessionLost = fn)

configureApi({
  getAccessToken,
  onUnauthorized: async ({ token }) => {
    // Someone else already refreshed while this request was in flight: just retry.
    if (token !== accessToken && accessToken) return true
    const ok = await refresh()
    if (!ok) onSessionLost?.() // beforeLoad re-runs and redirects to /login
    return ok
  },
})

// DEV ONLY: `__devBreakToken()` in the console makes the in-memory token invalid, as if it had
// expired. The next API call must answer 401, trigger ONE refresh and succeed on the retry.
if (import.meta.env.DEV && typeof window !== "undefined")
  (window as unknown as { __devBreakToken: () => void }).__devBreakToken =
    () => {
      if (accessToken) accessToken += "x"
    }
