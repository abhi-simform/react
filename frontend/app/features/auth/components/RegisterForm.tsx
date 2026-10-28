import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useLocation } from "react-router"

import { FormError } from "@/components/form/FormError"
import { FormField } from "@/components/form/FormField"
import { Button } from "@/components/ui/button"
import { useSingleFlight } from "@/hooks/useSingleFlight"
import { toApiError } from "@/lib/api/errors"
import { applyApiError } from "@/lib/forms/applyApiError"
import { paths } from "@/lib/paths"

import { useAuth } from "../AuthProvider"
import { CheckEmail } from "./CheckEmail"
import { GoogleButton } from "./GoogleButton"
import { getReturnTo } from "../returnTo"
import { registerSchema, type RegisterValues } from "../schemas"

/**
 * 7.2 + 7.3. `confirmPassword` and `acceptTerms` are form-only: they are not sent.
 * The server is authoritative: EMAIL_TAKEN (409) lands under the email field and focuses it,
 * and a 422 with several `details` shows ALL of them (e.g. if the client and server rules drift).
 */
export function RegisterForm() {
  const { signUp } = useAuth()
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const location = useLocation()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema) }) // checkbox starts unchecked: `false` fails `z.literal(true)`

  const onSubmit = useSingleFlight(
    async ({ name, email, password }: RegisterValues) => {
      try {
        const user = await signUp({ name, email, password })
        // Signed in already; the next step is the mailbox (10.5).
        setRegisteredEmail(user.email)
      } catch (err) {
        applyApiError(toApiError(err), setError, {
          fields: ["name", "email", "password"],
          codes: {
            EMAIL_TAKEN: {
              field: "email",
              message:
                "An account with this email already exists. Log in instead?",
            },
          },
        })
      }
    }
  )
  const submit = handleSubmit(onSubmit)

  if (registeredEmail)
    return (
      <CheckEmail email={registeredEmail} continueTo={getReturnTo(location)} />
    )

  return (
    <form
      className="mx-auto flex max-w-sm flex-col gap-3 p-4"
      onSubmit={submit}
      noValidate
    >
      <h1 className="text-xl font-medium">Create account</h1>
      <FormError
        error={errors.root?.server}
        onRetry={() => void submit()}
        retrying={isSubmitting}
      />
      <FormField label="Full name" error={errors.name?.message}>
        {(control) => (
          <input
            autoComplete="name"
            className="rounded border p-1"
            {...control}
            {...register("name")}
          />
        )}
      </FormField>
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
      <FormField
        label="Password"
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
        label="Confirm password"
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
      <FormField label="I accept the terms" error={errors.acceptTerms?.message}>
        {(control) => (
          <input
            type="checkbox"
            className="self-start"
            {...control}
            {...register("acceptTerms")}
          />
        )}
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create account"}
      </Button>
      <p className="text-center text-sm text-neutral-500">or</p>
      <GoogleButton label="Sign up with Google" />
      <p className="text-sm">
        Already have an account?{" "}
        <Link to={paths.login(getReturnTo(location, ""))} className="underline">
          Log in
        </Link>
      </p>
    </form>
  )
}
