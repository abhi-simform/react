import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import { ApiError } from "@/lib/api/errors"
import { useLocalStorage } from "@/hooks/useLocalStorage"

import {
  endSession,
  loginAsDevRole,
  loginWithPassword,
  registerAccount,
  onSessionLost,
  refreshSession,
} from "./session"
import type { AuthStatus, AuthUser, Role } from "./types"

/**
 * The auth context (8.2). STILL A STUB at the source: the user comes from the seeded dev
 * accounts and the real `/auth/login` (see `session.ts`); Stage 10 swaps the login source
 * (Google, real registration flow) without changing this shape. The status is
 * "loading" | "authenticated" | "anonymous"; "loading" matters, because a guard that treats
 * "not known yet" as "anonymous" bounces a signed-in user to /login on every refresh.
 *
 * Context is a DELIVERY mechanism, not a state manager: the state lives here (`useState`),
 * the context only carries it to descendants. The value is memoized, so a re-render of the
 * parent does not re-render every consumer; the actions are `useCallback`s for the same reason.
 * localStorage only remembers "someone was signed in" so a refresh knows to ask the API for a
 * new access token; the token itself is never persisted.
 */
type AuthValue = {
  status: AuthStatus
  user: AuthUser | null
  /** Rejects when the API is unreachable or refuses the dev account. */
  login: (role?: Role) => Promise<void>
  /** Real credentials (7.2). Rejects with an `ApiError` the form maps to fields. */
  signIn: (credentials: { email: string; password: string }) => Promise<void>
  /** Creates the account and signs in. Resolves with the user, for a confirmation message. */
  signUp: (input: {
    name: string
    email: string
    password: string
  }) => Promise<AuthUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

const STORAGE_KEY = "shopsphere.devUser"

function isAuthUser(value: unknown): value is AuthUser {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "role" in value &&
    (value.role === "customer" ||
      value.role === "seller" ||
      value.role === "admin") &&
    "name" in value &&
    typeof value.name === "string" &&
    "email" in value &&
    typeof value.email === "string"
  )
}

function hasRememberedUser(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw !== null && isAuthUser(JSON.parse(raw))
  } catch {
    return false
  }
}

type Session = { status: AuthStatus; user: AuthUser | null }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setRemembered, forget] = useLocalStorage<AuthUser | null>(
    STORAGE_KEY,
    null,
    (v): v is AuthUser | null => v === null || isAuthUser(v)
  )
  // "loading" until we know: the restore below asks the API, which takes time.
  const [session, setSession] = useState<Session>({
    status: "loading",
    user: null,
  })

  useEffect(() => {
    let cancelled = false
    const restore = hasRememberedUser()
      ? refreshSession()
      : Promise.resolve(null)
    restore
      .then((user) => {
        if (cancelled) return
        setSession(
          user
            ? { status: "authenticated", user }
            : { status: "anonymous", user: null }
        )
      })
      .catch((error: unknown) => {
        if (cancelled) return
        // 401 = the cookie is gone or expired: forget. Network error: keep the hint,
        // the next reload with the backend up restores the session.
        if (error instanceof ApiError && error.status === 401) forget()
        setSession({ status: "anonymous", user: null })
      })
    return () => {
      cancelled = true
    }
  }, [forget])

  // A 401 that a refresh could not fix: the session is over everywhere in the app.
  useEffect(
    () =>
      onSessionLost(() => {
        forget()
        setSession({ status: "anonymous", user: null })
      }),
    [forget]
  )

  const login = useCallback(
    async (role: Role = "customer") => {
      const user = await loginAsDevRole(role)
      setRemembered(user)
      setSession({ status: "authenticated", user })
    },
    [setRemembered]
  )
  const adoptUser = useCallback(
    (user: AuthUser) => {
      setRemembered(user)
      setSession({ status: "authenticated", user })
    },
    [setRemembered]
  )
  const signIn = useCallback(
    async (credentials: { email: string; password: string }) => {
      adoptUser(await loginWithPassword(credentials))
    },
    [adoptUser]
  )
  const signUp = useCallback(
    async (input: { name: string; email: string; password: string }) => {
      const user = await registerAccount(input)
      adoptUser(user)
      return user
    },
    [adoptUser]
  )
  const logout = useCallback(async () => {
    forget()
    setSession({ status: "anonymous", user: null })
    await endSession()
  }, [forget])

  const value = useMemo<AuthValue>(
    () => ({ ...session, login, signIn, signUp, logout }),
    [session, login, signIn, signUp, logout]
  )
  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>")
  return value
}
