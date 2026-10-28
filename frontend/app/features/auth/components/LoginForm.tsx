import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, useLocation, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { toApiError } from "@/lib/api/errors"
import { paths } from "@/lib/paths"

import { useAuth } from "../AuthContext"
import { getReturnTo } from "../returnTo"
import { loginSchema, type LoginValues } from "../schemas"

/** 7.2: real login form. `onSubmit(values)` is typed from the schema, there is no hand-written interface. */
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

  async function onSubmit(values: LoginValues) {
    try {
      await signIn(values)
      // `replace`: Back must not return to the login form.
      navigate(getReturnTo(location.state), { replace: true })
    } catch (err) {
      setError("root.server", { message: toApiError(err).message })
    }
  }

  return (
    <form
      className="mx-auto flex max-w-sm flex-col gap-3 p-4"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <h1 className="text-xl font-medium">Log in</h1>
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          type="email"
          autoComplete="email"
          className="rounded border p-1"
          {...register("email")}
        />
        {errors.email && <span role="alert">{errors.email.message}</span>}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input
          type="password"
          autoComplete="current-password"
          className="rounded border p-1"
          {...register("password")}
        />
        {errors.password && <span role="alert">{errors.password.message}</span>}
      </label>
      {errors.root?.server && (
        <p role="alert" className="text-sm text-red-700">
          {errors.root.server.message}
        </p>
      )}
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
