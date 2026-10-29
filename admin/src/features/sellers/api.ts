import { api, apiPaged } from "@/lib/api/client"

export type Application = {
  id: string
  user: { id: string; name?: string; email?: string }
  businessName: string
  gstin: string | null
  phone: string
  about: string
  status: "pending" | "approved" | "rejected"
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
}
export const listApplications = (
  p: { status?: string; page: number; limit: number },
  signal?: AbortSignal
) => apiPaged<Application>("/admin/seller-applications", { query: p, signal })
export const decideApplication = (
  id: string,
  decision: "approve" | "reject",
  note?: string
) =>
  api<Application>(`/admin/seller-applications/${id}/decision`, {
    method: "POST",
    body: { decision, note },
  })

export type SellerDetail = {
  id: string
  name: string
  email: string
  phone: string | null
  isActive: boolean
  joinedAt: string
  lastLoginAt: string | null
  products: { total: number; active: number; draft: number; archived: number }
  sales: { revenue: number; units: number; orders: number }
  application: Application | null
}
export const getSeller = (id: string, signal?: AbortSignal) =>
  api<SellerDetail>(`/admin/sellers/${id}`, { signal })
