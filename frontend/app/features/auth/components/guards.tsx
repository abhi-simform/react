import { Navigate, Outlet, useLocation } from "react-router"

import { paths } from "@/lib/paths"

import { useAuth } from "../AuthContext"
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

function ForbiddenPage({ role }: { role: Role }) {
  return (
    <div className="p-4">
      <h1 className="text-xl font-medium">403: Not allowed</h1>
      <p className="my-2 text-sm">
        This area is only for {role} accounts. You are signed in with a
        different role.
      </p>
      <a href={paths.home()} className="underline">
        Back to the home page
      </a>
    </div>
  )
}

/** Where we send anonymous users, remembering the whole URL (query and hash too). */
function RedirectToLogin() {
  const location = useLocation()
  return (
    <Navigate
      to={paths.login()}
      replace
      state={{ from: location.pathname + location.search + location.hash }}
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
  const { status } = useAuth()
  const location = useLocation()
  if (status === "loading") return <AuthLoading />
  if (status === "authenticated")
    return <Navigate to={getReturnTo(location.state)} replace />
  return <Outlet />
}

export function RequireRole({ role }: { role: Role }) {
  const { status, user } = useAuth()
  if (status === "loading") return <AuthLoading />
  if (status === "anonymous" || !user) return <RedirectToLogin />
  if (user.role !== role) return <ForbiddenPage role={role} />
  return <Outlet />
}
