import { useState } from "react"
import { useLocation, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"

import { useAuth } from "../AuthContext"
import { getReturnTo } from "../returnTo"
import type { Role } from "../types"

/** Stub login (real forms arrive in Stage 7/10): pick a role, land where you were going. */
export function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [role, setRole] = useState<Role>("customer")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  return (
    <form
      className="mx-auto flex max-w-sm flex-col gap-3 p-4"
      onSubmit={async (e) => {
        e.preventDefault()
        setPending(true)
        setError(undefined)
        try {
          await login(role) // real API call: needs the backend and the seeded accounts
          // `replace`: Back must not return to the login form.
          navigate(getReturnTo(location.state), { replace: true })
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not sign in")
          setPending(false)
        }
      }}
    >
      <h1 className="text-xl font-medium">Log in</h1>
      <label className="flex flex-col gap-1 text-sm">
        Sign in as (stub)
        <select
          className="rounded border p-1"
          value={role}
          onChange={(e) => {
            const value = e.target.value
            if (value === "customer" || value === "seller" || value === "admin")
              setRole(value)
          }}
        >
          <option value="customer">customer</option>
          <option value="seller">seller</option>
          <option value="admin">admin</option>
        </select>
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in..." : "Log in"}
      </Button>
    </form>
  )
}
