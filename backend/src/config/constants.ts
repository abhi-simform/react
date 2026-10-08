export const API_PREFIX = "/api/v1"
export const ROLES = ["customer", "seller", "admin"] as const
export type Role = (typeof ROLES)[number]
export const REFRESH_COOKIE = "refreshToken"
