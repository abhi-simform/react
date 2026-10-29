import { createFileRoute, Outlet } from "@tanstack/react-router"
import { requirePermission } from "@/lib/auth/guards"

export const Route = createFileRoute("/_authed/orders")({
  staticData: { crumb: "Orders" },
  beforeLoad: ({ context }) => requirePermission(context.user, "orders:read"),
  component: Outlet,
})
