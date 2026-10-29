import { createFileRoute, Outlet } from "@tanstack/react-router"
import { requirePermission } from "@/lib/auth/guards"

export const Route = createFileRoute("/_authed/products")({
  staticData: { crumb: "Products" },
  beforeLoad: ({ context }) => requirePermission(context.user, "products:read"),
  component: Outlet,
})
