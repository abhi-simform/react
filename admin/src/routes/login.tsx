import { useState } from "react"
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isApiError } from "@/lib/api/errors"
import { isStaff } from "@/lib/auth/can"
import { safeRedirect } from "@/lib/redirect"

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: async ({ context, search }) => {
    const user = await context.auth.ensureSession()
    if (isStaff(user)) throw redirect({ to: safeRedirect(search.redirect) })
  },
  component: LoginPage,
})

function LoginPage() {
  const { auth } = Route.useRouteContext()
  const search = Route.useSearch()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    try {
      await auth.login(String(form.get("email")), String(form.get("password")))
      await router.invalidate() // re-run the guards with the new session
      await router.navigate({
        to: safeRedirect(search.redirect),
        replace: true,
      })
    } catch (err) {
      setError(isApiError(err) ? err.message : "Could not sign in")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-medium">ShopSphere Admin</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </main>
  )
}
