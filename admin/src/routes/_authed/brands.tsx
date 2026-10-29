import { createFileRoute } from "@tanstack/react-router"
import { BrandManager } from "@/features/brands/BrandManager"
import { requirePermission } from "@/lib/auth/guards"

export const Route = createFileRoute("/_authed/brands")({
  staticData: { crumb: "Brands" },
  beforeLoad: ({ context }) => requirePermission(context.user, "brands:manage"),
  component: BrandManager,
})
