import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"

import { FormError } from "@/components/form/FormError"
import { FormField } from "@/components/form/FormField"
import { Button } from "@/components/ui/button"
import { useSingleFlight } from "@/hooks/useSingleFlight"
import { ApiError, toApiError } from "@/lib/api/errors"
import { applyApiError } from "@/lib/forms/applyApiError"
import { paths } from "@/lib/paths"

import { resetPassword } from "../auth.api"
import { useAuth } from "../AuthProvider"
import { resetPasswordSchema, type ResetPasswordValues } from "../schemas"

/**
 * /reset-password?token=... (10.5). The token goes from the URL into a ref and the address
 * bar is rewritten at once (same reasons as the verify page). The cost: reloading this page
 * loses the token, and the user must click the email link again. That is the intended trade.
 */
export function ResetPasswordForm() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { status, logout } = useAuth()
  const [token] = useState(() => searchParams.get("token"))
  const [tokenProblem, setTokenProblem] = useState<
    "expired" | "invalid" | null
  >(token ? null : "invalid")
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(resetPasswordSchema) })

  useEffect(() => {
    if (searchParams.has("token"))
      navigate(paths.resetPassword(), { replace: true })
  }, [searchParams, navigate])

  const onSubmit = useSingleFlight(
    async ({ password }: ResetPasswordValues) => {
      if (!token) return
      try {
        await resetPassword({ token, password })
        // The server just revoked every session, this browser's included.
        if (status === "authenticated") await logout()
        toast.success("Password updated. Log in with your new password.")
        navigate(paths.login(), { replace: true })
      } catch (err) {
        const apiError = toApiError(err)
        if (apiError instanceof ApiError && apiError.code === "TOKEN_EXPIRED")
          return setTokenProblem("expired")
        if (apiError instanceof ApiError && apiError.code === "INVALID_TOKEN")
          return setTokenProblem("invalid")
        applyApiError(apiError, setError, { fields: ["password"] })
      }
    }
  )
  const submit = handleSubmit(onSubmit)

  if (tokenProblem)
    return (
      <section
        className="mx-auto flex max-w-sm flex-col gap-3 p-4"
        role="alert"
      >
        <h1 className="text-xl font-medium">
          {tokenProblem === "expired"
            ? "This link has expired"
            : "This link is not valid"}
        </h1>
        <p className="text-sm">
          {tokenProblem === "expired"
            ? "Reset links work for one hour."
            : "It may already have been used, or it is incomplete."}{" "}
          Request a new one to continue.
        </p>
        <Link className="underline" to={paths.forgotPassword()}>
          Request a new reset link
        </Link>
      </section>
    )

  return (
    <form
      className="mx-auto flex max-w-sm flex-col gap-3 p-4"
      onSubmit={submit}
      noValidate
    >
      <h1 className="text-xl font-medium">Choose a new password</h1>
      <FormError
        error={errors.root?.server}
        onRetry={() => void submit()}
        retrying={isSubmitting}
      />
      <FormField
        label="New password"
        hint="At least 8 characters, with upper and lower case letters and a number."
        error={errors.password?.message}
      >
        {(control) => (
          <input
            type="password"
            autoComplete="new-password"
            className="rounded border p-1"
            {...control}
            {...register("password")}
          />
        )}
      </FormField>
      <FormField
        label="Confirm new password"
        error={errors.confirmPassword?.message}
      >
        {(control) => (
          <input
            type="password"
            autoComplete="new-password"
            className="rounded border p-1"
            {...control}
            {...register("confirmPassword")}
          />
        )}
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Set new password"}
      </Button>
    </form>
  )
}
