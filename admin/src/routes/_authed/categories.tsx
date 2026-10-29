import { createFileRoute } from "@tanstack/react-router"
import { CategoryManager } from "@/features/categories/CategoryManager"
import { requirePermission } from "@/lib/auth/guards"

export const Route = createFileRoute("/_authed/categories")({
  staticData: { crumb: "Categories" },
  beforeLoad: ({ context }) =>
    requirePermission(context.user, "categories:manage"),
  component: CategoryManager,
})
