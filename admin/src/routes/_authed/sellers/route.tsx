import { createFileRoute, Outlet } from "@tanstack/react-router"
import { requirePermission } from "@/lib/auth/guards"

export const Route = createFileRoute("/_authed/sellers")({
  staticData: { crumb: "Sellers" },
  beforeLoad: ({ context }) =>
    requirePermission(context.user, "sellers:manage"),
  component: Outlet,
})
