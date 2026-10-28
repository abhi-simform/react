import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, useLocation, useNavigate } from "react-router"

import { FormError } from "@/components/form/FormError"
import { FormField } from "@/components/form/FormField"
import { Button } from "@/components/ui/button"
import { useSingleFlight } from "@/hooks/useSingleFlight"
import { toApiError } from "@/lib/api/errors"
import { applyApiError } from "@/lib/forms/applyApiError"
import { paths } from "@/lib/paths"

import { useAuth } from "../AuthContext"
import { getReturnTo } from "../returnTo"
import { loginSchema, type LoginValues } from "../schemas"

/** 7.2 + 7.3: real login. `onSubmit(values)` is typed from the schema; errors come from the API. */
export function LoginForm() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) })

  const onSubmit = useSingleFlight(async (values: LoginValues) => {
    try {
      await signIn(values)
      // `replace`: Back must not return to the login form.
      navigate(getReturnTo(location.state), { replace: true })
    } catch (err) {
      applyApiError(toApiError(err), setError, {
        fields: ["email", "password"],
        codes: {
          // ONE message for "no such email" and "wrong password": the form must not
          // reveal which emails have an account (account enumeration).
          INVALID_CREDENTIALS: { message: "Incorrect email or password." },
          AUTH_RATE_LIMITED: {
            message: "Too many attempts. Wait a few minutes and try again.",
          },
        },
      })
    }
  })
  const submit = handleSubmit(onSubmit)

  return (
    <form
      className="mx-auto flex max-w-sm flex-col gap-3 p-4"
      onSubmit={submit}
      noValidate
    >
      <h1 className="text-xl font-medium">Log in</h1>
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
      <FormField label="Password" error={errors.password?.message}>
        {(control) => (
          <input
            type="password"
            autoComplete="current-password"
            className="rounded border p-1"
            {...control}
            {...register("password")}
          />
        )}
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Log in"}
      </Button>
      <p className="text-sm">
        New here?{" "}
        <Link
          to={paths.register()}
          state={location.state}
          className="underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  )
}
