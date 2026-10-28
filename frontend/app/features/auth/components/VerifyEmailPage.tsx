import { useMutation } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"

import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api/errors"
import { paths } from "@/lib/paths"

import { verifyEmail } from "../auth.api"
import { useAuth } from "../AuthProvider"
import { ResendVerificationButton } from "./ResendVerificationButton"

/**
 * /verify-email?token=... (10.5). The token is SINGLE-USE, so two things must not happen:
 * - a double fire: React StrictMode runs effects twice in development, and a second call
 *   would find the token already burned. The `started` ref (it survives that simulated
 *   remount) lets exactly one request go out;
 * - a leak: the token is read ONCE into a ref and the address bar is rewritten (`replace`),
 *   so it is not left in history, not copied with the URL, and not sent as a Referer.
 */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { status, user, reloadUser } = useAuth()
  const [token] = useState(() => searchParams.get("token"))
  const started = useRef(false)

  const { mutate, data, error, isPending, isSuccess, isError } = useMutation({
    mutationFn: verifyEmail,
    meta: { silent: true }, // this page explains its own failures
  })

  useEffect(() => {
    if (searchParams.has("token"))
      navigate(paths.verifyEmail(), { replace: true })
    if (!token || started.current) return
    started.current = true
    mutate(token)
  }, [token, mutate, navigate, searchParams])

  // Verified here, but the signed-in user object still says "unverified": refresh it (banner goes away).
  useEffect(() => {
    if (isSuccess && status === "authenticated" && user && !user.emailVerified)
      void reloadUser()
  }, [isSuccess, status, user, reloadUser])

  const code = error instanceof ApiError ? error.code : null

  return (
    <section
      className="mx-auto flex max-w-sm flex-col gap-3 p-4"
      aria-live="polite"
    >
      <h1 className="text-xl font-medium">Verify your email</h1>
      {!token && (
        <p>
          This page needs the link from your verification email. Open the email
          and click the link again, or{" "}
          {status === "authenticated" ? (
            <span className="inline-flex">
              <ResendVerificationButton />
            </span>
          ) : (
            <Link className="underline" to={paths.login(paths.verifyEmail())}>
              log in to request a new one
            </Link>
          )}
          .
        </p>
      )}
      {isPending && <p>Verifying...</p>}
      {isSuccess && (
        <>
          <p role="status">
            {data.alreadyVerified
              ? "This email address was already verified. You are all set."
              : "Your email address is verified. Thank you!"}
          </p>
          <Link className="underline" to={paths.home()}>
            Continue shopping
          </Link>
        </>
      )}
      {isError && code === "TOKEN_EXPIRED" && (
        <>
          <p role="alert">This verification link has expired.</p>
          {status === "authenticated" ? (
            <ResendVerificationButton />
          ) : (
            <Link className="underline" to={paths.login(paths.verifyEmail())}>
              Log in to get a new link
            </Link>
          )}
        </>
      )}
      {isError && code === "INVALID_TOKEN" && (
        <p role="alert">
          This verification link is not valid. It may be mistyped, or replaced
          by a newer email.{" "}
          {status === "authenticated" &&
            "Request a new one from the banner at the top."}
        </p>
      )}
      {isError && code !== "TOKEN_EXPIRED" && code !== "INVALID_TOKEN" && (
        <>
          <p role="alert">We could not verify your email right now.</p>
          {token && (
            <Button
              type="button"
              variant="outline"
              onClick={() => mutate(token)}
            >
              Try again
            </Button>
          )}
        </>
      )}
    </section>
  )
}
