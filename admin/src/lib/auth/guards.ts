import { redirect } from "@tanstack/react-router"
import { can, type Permission } from "./can"
import type { SessionUser } from "./session"

/** Route-level role guard for `beforeLoad` (after `_authed` has put `user` in the context). */
export function requirePermission(user: SessionUser, permission: Permission) {
  if (!can(user, permission))
    throw redirect({ to: "/forbidden", search: { reason: "permission" } })
}
