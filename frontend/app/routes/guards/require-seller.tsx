import { RequireRole } from "@/features/auth"

// Mirrors the API: `authorize("seller", "admin")` on /seller/*.
const SELLER_ROLES = ["seller", "admin"] as const

export default function RequireSeller() {
  return <RequireRole roles={SELLER_ROLES} />
}
