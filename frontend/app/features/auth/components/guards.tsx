import { Navigate, Outlet, useLocation } from "react-router"

import { paths } from "@/lib/paths"

import { useAuth } from "../AuthProvider"
import { getReturnTo } from "../returnTo"
import type { Role } from "../types"

/**
 * Guards are LAYOUT routes: they render the matched children through <Outlet/>
 * only when the condition holds. They are UX, NOT security: this code runs in
 * the user's browser, where anyone can edit localStorage or the bundle. The API
 * must reject unauthenticated/unauthorised requests on its own (it does: 401/403).
 *
 * While status is "loading" we do not know who the user is, so we must NOT
 * redirect (a logged-in user would be bounced to /login for a moment).
 */
function AuthLoading() {
  return (
    <div className="p-4" aria-busy="true">
      <h1 className="text-xl font-medium">Loading...</h1>
      <p role="status" className="text-sm text-neutral-500">
        Checking your session
      </p>
      <div
        aria-hidden
        className="mt-3 h-24 animate-pulse rounded bg-neutral-100"
      />
    </div>
  )
}

export function ForbiddenPage({ roles }: { roles: readonly Role[] }) {
  return (
    <div className="p-4">
      <h1 className="text-xl font-medium">403: Not allowed</h1>
      <p className="my-2 text-sm">
        This area is only for {roles.join(" or ")} accounts. You are signed in
        with a different role. (Hiding this page is only courtesy: the API
        refuses these requests on its own.)
      </p>
      <a href={paths.home()} className="underline">
        Back to the home page
      </a>
    </div>
  )
}

/**
 * Where we send anonymous users, remembering the whole URL (query and hash too) in `?from=`:
 * unlike navigation state it survives a reload and the Google round trip. `getReturnTo`
 * validates it again on the way back.
 */
function RedirectToLogin() {
  const location = useLocation()
  const { signedOutByUser } = useAuth()
  // The user just chose to log out of this very page: home, not "log in to continue".
  if (signedOutByUser) return <Navigate to={paths.home()} replace />
  return (
    <Navigate
      to={paths.login(location.pathname + location.search + location.hash)}
      replace
    />
  )
}

export function RequireAuth() {
  const { status } = useAuth()
  if (status === "loading") return <AuthLoading />
  if (status === "anonymous") return <RedirectToLogin />
  return <Outlet />
}

/** Login/register: signed-in users have nothing to do there. */
export function PublicOnly() {
  const { status, registering } = useAuth()
  const location = useLocation()
  if (status === "loading") return <AuthLoading />
  if (status === "authenticated" && !registering)
    return <Navigate to={getReturnTo(location)} replace />
  return <Outlet />
}

export function RequireRole({ roles }: { roles: readonly Role[] }) {
  const { status, user } = useAuth()
  if (status === "loading") return <AuthLoading />
  if (status === "anonymous" || !user) return <RedirectToLogin />
  if (!roles.includes(user.role)) return <ForbiddenPage roles={roles} />
  return <Outlet />
}
