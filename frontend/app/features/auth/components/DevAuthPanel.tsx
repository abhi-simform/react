import { toast } from "sonner"

import { useAuth } from "../AuthContext"
import type { Role } from "../types"

/** Dev-only: sign in as a seeded account (REAL token from the API) without a form. Not shipped in production builds. */
export function DevAuthPanel() {
  const { status, user, login, logout } = useAuth()
  if (!import.meta.env.DEV) return null

  async function signIn(role: Role) {
    try {
      await login(role)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not sign in as " + role
      )
    }
  }

  return (
    <div
      aria-label="Dev auth panel"
      role="group"
      className="flex flex-wrap items-center gap-2 border-t bg-neutral-100 p-2 text-xs"
    >
      <span>
        Dev auth: {status}
        {user ? ` (${user.role})` : ""}
      </span>
      {(["customer", "seller", "admin"] as const).map((role) => (
        <button
          key={role}
          type="button"
          className="rounded border px-1"
          onClick={() => void signIn(role)}
        >
          Sign in as {role}
        </button>
      ))}
      <button
        type="button"
        className="rounded border px-1"
        onClick={() => void logout()}
      >
        Sign out
      </button>
    </div>
  )
}
