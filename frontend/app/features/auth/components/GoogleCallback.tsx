import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"

import { paths } from "@/lib/paths"

import { useAuth } from "../AuthProvider"
import { safeRedirect } from "../returnTo"

const ERRORS: Record<string, string> = {
  access_denied:
    "You cancelled the Google sign-in. No problem: nothing was changed.",
  invalid_state:
    "That sign-in attempt expired or did not start here. Please try again.",
  email_not_verified:
    "Google says your email address is not verified, so we cannot use it to sign you in.",
  account_disabled: "This account has been disabled.",
  google_not_configured: "Google sign-in is not set up on this server.",
  google_failed: "Google sign-in failed. Please try again.",
}

/**
 * Where the API sends the browser after Google (10.6). By now the refresh cookie is set; this
 * page only has to do the normal silent refresh (`refresh()` adopts the user exactly like a
 * password login), then go where the user was headed. All query values are validated: the
 * address bar is attacker-writable.
 */
export function GoogleCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  // Read once: the URL is cleaned right away and StrictMode runs the effect twice.
  const [params] = useState(() => ({
    error: searchParams.get("error"),
    redirect: safeRedirect(searchParams.get("redirect")),
    linked: searchParams.get("linked") === "1",
    created: searchParams.get("created") === "1",
  }))
  const started = useRef(false)
  const [failed, setFailed] = useState<string | null>(
    params.error ? (ERRORS[params.error] ?? ERRORS.google_failed!) : null
  )

  useEffect(() => {
    if (searchParams.size > 0)
      navigate(paths.googleCallback(), { replace: true }) // tidy URL
    if (params.error || started.current) return
    started.current = true
    refresh()
      .then(() => {
        if (params.linked)
          toast.success(
            "Signed in with Google. We linked it to your existing account."
          )
        else if (params.created)
          toast.success("Welcome! Your account was created with Google.")
        navigate(params.redirect, { replace: true })
      })
      .catch(() => setFailed(ERRORS.google_failed!))
  }, [params, refresh, navigate, searchParams])

  if (failed)
    return (
      <section
        className="mx-auto flex max-w-sm flex-col gap-3 p-4"
        role="alert"
      >
        <h1 className="text-xl font-medium">Google sign-in did not finish</h1>
        <p className="text-sm">{failed}</p>
        <Link className="underline" to={paths.login(params.redirect)}>
          Back to log in
        </Link>
      </section>
    )
  return (
    <section
      className="mx-auto flex max-w-sm flex-col gap-3 p-4"
      aria-busy="true"
    >
      <h1 className="text-xl font-medium">Signing you in with Google</h1>
      <p role="status" className="text-sm">
        One moment...
      </p>
    </section>
  )
}
