import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link } from "react-router"

import { FormError } from "@/components/form/FormError"
import { FormField } from "@/components/form/FormField"
import { Button } from "@/components/ui/button"
import { useSingleFlight } from "@/hooks/useSingleFlight"
import { toApiError } from "@/lib/api/errors"
import { applyApiError } from "@/lib/forms/applyApiError"
import { paths } from "@/lib/paths"

import { forgotPassword } from "../auth.api"
import { forgotPasswordSchema, type ForgotPasswordValues } from "../schemas"

/**
 * 10.5: the confirmation is IDENTICAL whether or not the email has an account (the API does
 * the same), otherwise this form is a tool to test which emails are registered.
 */
export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = useSingleFlight(async ({ email }: ForgotPasswordValues) => {
    try {
      await forgotPassword(email)
      setSentTo(email)
    } catch (err) {
      applyApiError(toApiError(err), setError, {
        fields: ["email"],
        codes: {
          AUTH_RATE_LIMITED: {
            message: "Too many attempts. Wait a few minutes and try again.",
          },
        },
      })
    }
  })
  const submit = handleSubmit(onSubmit)

  if (sentTo)
    return (
      <section
        className="mx-auto flex max-w-sm flex-col gap-3 p-4"
        role="status"
      >
        <h1 className="text-xl font-medium">Check your email</h1>
        <p className="text-sm">
          If an account exists for <strong>{sentTo}</strong>, we sent a link to
          reset the password. It is valid for one hour.
        </p>
        <Link className="underline" to={paths.login()}>
          Back to log in
        </Link>
      </section>
    )

  return (
    <form
      className="mx-auto flex max-w-sm flex-col gap-3 p-4"
      onSubmit={submit}
      noValidate
    >
      <h1 className="text-xl font-medium">Forgot password</h1>
      <p className="text-sm">
        Enter your email and we will send you a reset link.
      </p>
      <FormError
        error={errors.root?.server}
        onRetry={() => void submit()}
        retrying={isSubmitting}
      />
      <FormField label="Email" error={errors.email?.message}>
        {(control) => (
          <input
            type="email"
            autoComplete="email"
            className="rounded border p-1"
            {...control}
            {...register("email")}
          />
        )}
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send reset link"}
      </Button>
      <Link className="text-sm underline" to={paths.login()}>
        Back to log in
      </Link>
    </form>
  )
}
