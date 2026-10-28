import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, useLocation, useNavigate } from "react-router"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { toApiError } from "@/lib/api/errors"
import { paths } from "@/lib/paths"

import { useAuth } from "../AuthContext"
import { getReturnTo } from "../returnTo"
import { registerSchema, type RegisterValues } from "../schemas"

/**
 * 7.2: the schema is the one in the plan (name, email, password, confirmPassword, acceptTerms).
 * `confirmPassword` and `acceptTerms` are form-only: they are stripped before the API call.
 */
export function RegisterForm() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema) }) // checkbox starts unchecked: `false` fails `z.literal(true)`

  async function onSubmit({ name, email, password }: RegisterValues) {
    try {
      const user = await signUp({ name, email, password })
      // Result handling stays minimal until Stage 10: show who we got back, then leave.
      toast.success(`Account created for ${user.name} (${user.email})`)
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
      <h1 className="text-xl font-medium">Create account</h1>
      <label className="flex flex-col gap-1 text-sm">
        Full name
        <input
          autoComplete="name"
          className="rounded border p-1"
          {...register("name")}
        />
        {errors.name && <span role="alert">{errors.name.message}</span>}
      </label>
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
          autoComplete="new-password"
          className="rounded border p-1"
          {...register("password")}
        />
        {errors.password && <span role="alert">{errors.password.message}</span>}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Confirm password
        <input
          type="password"
          autoComplete="new-password"
          className="rounded border p-1"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <span role="alert">{errors.confirmPassword.message}</span>
        )}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("acceptTerms")} />I accept the terms
      </label>
      {errors.acceptTerms && (
        <span role="alert" className="text-sm">
          {errors.acceptTerms.message}
        </span>
      )}
      {errors.root?.server && (
        <p role="alert" className="text-sm text-red-700">
          {errors.root.server.message}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create account"}
      </Button>
      <p className="text-sm">
        Already have an account?{" "}
        <Link to={paths.login()} state={location.state} className="underline">
          Log in
        </Link>
      </p>
    </form>
  )
}
