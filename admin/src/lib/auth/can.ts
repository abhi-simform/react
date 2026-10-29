import type { Role } from "./session"

// The UI only HIDES what a role cannot use. The API is the real gate (403/404): see backend tests.
export const PERMISSIONS = [
  "dashboard:view",
  "products:read",
  "products:write",
  "categories:manage",
  "brands:manage",
  "users:manage",
  "orders:read",
  "orders:update", // status moves, notes, refunds
  "returns:manage",
  "marketing:manage", // coupons, deals, banners
  "moderation:manage", // reviews, Q&A
  "sellers:manage", // seller applications and detail
  "audit:view",
  "system:view", // health + settings
] as const
export type Permission = (typeof PERMISSIONS)[number]

const BY_ROLE: Record<Role, readonly Permission[]> = {
  admin: PERMISSIONS,
  // Own products, own order lines (read-only) and own numbers: all enforced by the API.
  seller: ["dashboard:view", "products:read", "products:write", "orders:read"],
  customer: [],
}

export const can = (
  user: { role: Role } | null | undefined,
  permission: Permission
) => !!user && BY_ROLE[user.role].includes(permission)

/** Roles allowed into the admin shell at all. */
export const isStaff = (user: { role: Role } | null | undefined) =>
  !!user && (user.role === "admin" || user.role === "seller")
