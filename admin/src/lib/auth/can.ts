import type { Role } from "./session"

// The UI only HIDES what a role cannot use. The API is the real gate (403/404): see backend tests.
export const PERMISSIONS = [
  "dashboard:view",
  "products:read",
  "products:write",
  "categories:manage",
  "brands:manage",
  "users:manage",
] as const
export type Permission = (typeof PERMISSIONS)[number]

const BY_ROLE: Record<Role, readonly Permission[]> = {
  admin: PERMISSIONS,
  seller: ["products:read", "products:write"], // own products only: enforced by the API
  customer: [],
}

export const can = (
  user: { role: Role } | null | undefined,
  permission: Permission
) => !!user && BY_ROLE[user.role].includes(permission)

/** Roles allowed into the admin shell at all. */
export const isStaff = (user: { role: Role } | null | undefined) =>
  !!user && (user.role === "admin" || user.role === "seller")
