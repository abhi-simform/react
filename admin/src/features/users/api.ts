import { api, apiPaged } from "@/lib/api/client"
import type { Role } from "@/lib/auth/session"

export type AdminUser = {
  id: string
  name: string
  email: string
  role: Role
  phone: string | null
  emailVerified: boolean
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}
export type UserListParams = {
  search?: string
  role?: string
  isActive?: boolean
  sort: string
  order: string
  page: number
  limit: number
}
export const listUsers = (p: UserListParams, signal?: AbortSignal) =>
  apiPaged<AdminUser>("/admin/users", { query: p, signal })
export const changeRole = (id: string, role: Role) =>
  api<AdminUser>(`/admin/users/${id}/role`, { method: "PATCH", body: { role } })
export const setActive = (id: string, isActive: boolean) =>
  api<AdminUser>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: { isActive },
  })
