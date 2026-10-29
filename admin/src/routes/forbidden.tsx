import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { useSignOut } from "@/lib/auth/useSignOut"

export const Route = createFileRoute("/forbidden")({
  validateSearch: (s: Record<string, unknown>) => ({
    reason:
      s.reason === "permission" ? ("permission" as const) : ("role" as const),
  }),
  // No admin data is loaded here: it renders from the session alone.
  beforeLoad: async ({ context }) => ({
    user: await context.auth.ensureSession(),
  }),
  component: Forbidden,
})

function Forbidden() {
  const { user } = Route.useRouteContext()
  const { reason } = Route.useSearch()
  const signOut = useSignOut()
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-3 p-6">
      <h1 className="text-xl font-medium">No permission</h1>
      <p>
        {reason === "permission"
          ? "Your role cannot open that page."
          : `This console is for sellers and admins. ${user ? `You are signed in as ${user.email} (${user.role}).` : ""}`}
      </p>
      <div className="flex gap-2">
        {user && reason === "permission" ? (
          <Button nativeButton={false} render={<Link to="/" />}>
            Back to the console
          </Button>
        ) : null}
        {user ? (
          <Button variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
        ) : (
          <Button nativeButton={false} render={<Link to="/login" />}>
            Sign in
          </Button>
        )}
      </div>
    </main>
  )
}
