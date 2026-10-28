import { useState } from "react"
import { useLocation, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { getReturnTo, useAuth, type Role } from "@/features/auth"

/** Stub login (real forms arrive in Stage 7/10): pick a role, land where you were going. */
export default function LoginRoute() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [role, setRole] = useState<Role>("customer")

  return (
    <form
      className="mx-auto flex max-w-sm flex-col gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        login(role)
        // `replace`: Back must not return to the login form.
        navigate(getReturnTo(location.state), { replace: true })
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
      <Button type="submit">Log in</Button>
    </form>
  )
}
