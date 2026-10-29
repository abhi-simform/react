import { createFileRoute, redirect } from "@tanstack/react-router"
import { can } from "@/lib/auth/can"

export const Route = createFileRoute("/_authed/")({
  staticData: { crumb: "Dashboard" },
  // A.6 builds the dashboard (admin only). Until then sellers land on their products.
  beforeLoad: ({ context }) => {
    if (!can(context.user, "dashboard:view"))
      throw redirect({ to: "/products", search: {} })
  },
  component: () => (
    <section>
      <h1 className="text-lg font-medium">Dashboard</h1>
      <p className="text-muted-foreground">Charts arrive in A.6.</p>
    </section>
  ),
})
