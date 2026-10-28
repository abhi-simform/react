import { useAuth } from "../AuthContext"

/** Dev-only: flip the fake session without going through a form. Not shipped in production builds. */
export function DevAuthPanel() {
  const { status, user, login, logout } = useAuth()
  if (!import.meta.env.DEV) return null
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
          onClick={() => login(role)}
        >
          Sign in as {role}
        </button>
      ))}
      <button type="button" className="rounded border px-1" onClick={logout}>
        Sign out
      </button>
    </div>
  )
}
