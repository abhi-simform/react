import { apiPaged } from "@/lib/api/client"

export type AuditEntry = {
  id: string
  at: string
  actor: { id: string; name: string; email: string } | null
  role: string | null
  action: string
  path: string
  targets: string[]
  status: number
  ip: string | null
  requestId: string | null
  changes: Record<string, { before: unknown; after: unknown }> | null
}
export type AuditParams = {
  actor?: string
  entity?: string
  action?: string
  from?: string
  to?: string
  page: number
  limit: number
}
export const AUDIT_ENTITIES = [
  "products",
  "categories",
  "brands",
  "users",
  "orders",
  "returns",
  "payments",
  "coupons",
  "deals",
  "banners",
  "reviews",
  "questions",
  "answers",
  "seller-applications",
  "system",
  "notifications",
] as const

export const listAudit = (p: AuditParams, signal?: AbortSignal) =>
  apiPaged<AuditEntry>("/admin/audit-logs", {
    query: {
      ...p,
      // the API takes instants; the picker gives India days
      from: p.from ? `${p.from}T00:00:00+05:30` : undefined,
      to: p.to ? `${p.to}T23:59:59.999+05:30` : undefined,
    },
    signal,
  })
