import { useQueryClient } from "@tanstack/react-query"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { toast } from "sonner"

import { clearAllDrafts } from "@/hooks/useFormDraft"
import { useLatest } from "@/hooks/useLatest"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { ApiError } from "@/lib/api/errors"
import { authKeys } from "@/lib/queryKeys"

import { getMe } from "./auth.api"
import { broadcastAuth, onAuthMessage } from "./authChannel"
import {
  accessTokenExpiresAt,
  clearAccessToken,
  endSession,
  loginWithPassword,
  onSessionLost,
  refreshSession,
  registerAccount,
} from "./session"
import type { AuthStatus, AuthUser } from "./types"

/**
 * The auth context (8.2, real since 10.2). The status is "loading" | "authenticated" |
 * "anonymous"; "loading" matters, because a guard that treats "not known yet" as "anonymous"
 * bounces a signed-in user to /login on every reload.
 *
 * Context is a DELIVERY mechanism, not a state manager: the state lives here (`useState`),
 * the context only carries it. The value is memoized and the actions are `useCallback`s, so a
 * parent re-render does not re-render every consumer.
 */
type AuthValue = {
  status: AuthStatus
  user: AuthUser | null
  /** true right after an explicit log out (until the next sign-in). Guards use it to go home. */
  signedOutByUser: boolean
  /** true between registering and leaving the "Check your email" screen. */
  registering: boolean
  /** Leave the "Check your email" screen state. */
  finishRegistration: () => void
  /** Real credentials. Rejects with an `ApiError` the form maps to fields. */
  signIn: (credentials: {
    email: string
    password: string
  }) => Promise<AuthUser>
  /** Creates the account (the API signs it in and mails a verification link). */
  signUp: (input: {
    name: string
    email: string
    password: string
  }) => Promise<AuthUser>
  /**
   * Ask the API for a new access token using the refresh cookie and adopt the user. Used by
   * the Google callback (the cookie was set by a redirect, not by a fetch of ours) and by
   * "Stay signed in". Single-flight: concurrent callers share one request.
   */
  refresh: () => Promise<AuthUser>
  /** Re-read `/users/me` (e.g. after the email got verified in this or another tab). */
  reloadUser: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

/**
 * Only a HINT is persisted ("a session probably exists, ask the API"), never the user or a
 * token: the user is server data (a stored copy goes stale and can be edited by hand), and a
 * stored token is exactly what XSS would steal.
 */
const STORAGE_KEY = "shopsphere.hasSession"
const isHint = (v: unknown): v is boolean => typeof v === "boolean"

function hasSessionHint(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

type Session = {
  status: AuthStatus
  user: AuthUser | null
  /** The user pressed "Log out" (as opposed to a session that expired): guards then go HOME, not to /login. */
  signedOutByUser: boolean
  /** Just registered: /register must stay open to show "Check your email" (PublicOnly would bounce a signed-in user). */
  registering: boolean
}
const ANONYMOUS: Session = {
  status: "anonymous",
  user: null,
  signedOutByUser: false,
  registering: false,
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [, setHint, forget] = useLocalStorage<boolean>(
    STORAGE_KEY,
    false,
    isHint
  )
  // "loading" until we know: the restore below asks the API, which takes time.
  const [session, setSession] = useState<Session>({
    status: "loading",
    user: null,
    signedOutByUser: false,
    registering: false,
  })

  const adoptUser = useCallback(
    (user: AuthUser, registering = false) => {
      setHint(true)
      queryClient.setQueryData(authKeys.me, user)
      setSession({
        status: "authenticated",
        user,
        signedOutByUser: false,
        registering,
      })
      return user
    },
    [setHint, queryClient]
  )

  /** Leave "signed in" WITHOUT telling the server (it already knows, or the session is dead). */
  const dropSession = useCallback(
    (byUser = false) => {
      forget()
      clearAccessToken()
      setSession({ ...ANONYMOUS, signedOutByUser: byUser })
      // Nobody else's data may survive: this wipes every cached query (10.2).
      queryClient.clear()
    },
    [forget, queryClient]
  )

  // Bootstrap: one refresh (the response already carries the user, so no second `me` call).
  // Two effect runs (StrictMode) share the single in-flight promise in session.ts.
  useEffect(() => {
    let cancelled = false
    const restore = hasSessionHint() ? refreshSession() : Promise.resolve(null)
    restore
      .then((user) => {
        if (cancelled) return
        if (user) adoptUser(user)
        else setSession(ANONYMOUS)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        // 401 = the cookie is gone or expired: forget. Network error: keep the hint,
        // the next reload with the backend up restores the session.
        if (error instanceof ApiError && error.status === 401) forget()
        setSession(ANONYMOUS)
      })
    return () => {
      cancelled = true
    }
  }, [adoptUser, forget])

  // A 401 that a refresh could not fix: the session is over everywhere in the app. (Ignored when
  // we are not signed in: a request that was still in flight during a deliberate logout fails too.)
  const latestSession = useLatest(session)
  useEffect(
    () =>
      onSessionLost(() => {
        if (latestSession.current.status !== "authenticated") return
        dropSession()
        toast.warning("Your session expired. Please log in again.", {
          id: "session-expired",
        })
      }),
    [dropSession, latestSession]
  )

  // Other tabs (10.7): logout there = logout here; login there = pick the session up here.
  useEffect(
    () =>
      onAuthMessage((message) => {
        if (message === "logout") {
          dropSession()
          toast.info("You were signed out in another tab.", {
            id: "tab-logout",
          })
        } else {
          void refreshSession()
            .then(adoptUser)
            .catch(() => undefined)
        }
      }),
    [dropSession, adoptUser]
  )

  // Coming back to a tab that slept: a revoked or expired session should show NOW, not on the next click.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible" || !hasSessionHint()) return
      // Token still good for a while: nothing to learn from the server yet.
      const exp = accessTokenExpiresAt()
      if (exp && exp - Date.now() > 30_000) return
      void refreshSession()
        .then(adoptUser)
        .catch((error: unknown) => {
          if (error instanceof ApiError && error.status === 401) {
            dropSession()
            toast.warning("Your session expired. Please log in again.", {
              id: "session-expired",
            })
          }
        })
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [adoptUser, dropSession])

  const signIn = useCallback(
    async (credentials: { email: string; password: string }) => {
      const user = adoptUser(await loginWithPassword(credentials))
      broadcastAuth("login")
      return user
    },
    [adoptUser]
  )
  const signUp = useCallback(
    async (input: { name: string; email: string; password: string }) => {
      const user = adoptUser(await registerAccount(input), true)
      broadcastAuth("login")
      return user
    },
    [adoptUser]
  )
  const refresh = useCallback(async () => {
    const user = adoptUser(await refreshSession())
    broadcastAuth("login")
    return user
  }, [adoptUser])
  const reloadUser = useCallback(async () => {
    adoptUser(await getMe())
  }, [adoptUser])
  const logout = useCallback(async () => {
    clearAllDrafts() // an explicit logout leaves nothing typed behind (shared computers)
    dropSession(true)
    broadcastAuth("logout")
    await endSession()
  }, [dropSession])

  const finishRegistration = useCallback(
    () => setSession((s) => (s.registering ? { ...s, registering: false } : s)),
    []
  )

  const value = useMemo<AuthValue>(
    () => ({
      ...session,
      finishRegistration,
      signIn,
      signUp,
      refresh,
      reloadUser,
      logout,
    }),
    [session, finishRegistration, signIn, signUp, refresh, reloadUser, logout]
  )
  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>")
  return value
}
