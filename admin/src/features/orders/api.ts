import { api, apiPaged, apiText } from "@/lib/api/client"
import type {
  AdminOrder,
  AdminOrderDetail,
  OrderStatus,
  SellerOrder,
} from "./types"

export type OrderListParams = {
  status?: string
  paymentMethod?: string
  search?: string
  from?: string
  to?: string
  sort: string
  order: string
  page: number
  limit: number
}
export const listOrders = (p: OrderListParams, signal?: AbortSignal) =>
  apiPaged<AdminOrder>("/admin/orders", { query: p, signal })
export const exportOrdersCsv = (p: Omit<OrderListParams, "page" | "limit">) =>
  apiText("/admin/orders/export.csv", { query: p })
export const getOrder = (id: string, signal?: AbortSignal) =>
  api<AdminOrderDetail>(`/admin/orders/${id}`, { signal })

export type StatusInput = {
  status: OrderStatus
  note?: string
  shipment?: { carrier: string; trackingId: string }
}
export const changeStatus = (id: string, body: StatusInput) =>
  api<AdminOrder>(`/admin/orders/${id}/status`, { method: "POST", body })
export const addNote = (id: string, text: string) =>
  api<AdminOrderDetail>(`/admin/orders/${id}/notes`, {
    method: "POST",
    body: { text },
  })

/** One Idempotency-Key per refund INTENT: retries of the same click send the same key. */
export const refundPayment = (
  paymentId: string,
  body: { amount?: number; reason: string },
  idempotencyKey: string
) =>
  api<{ refundedAmount: number }>(`/admin/payments/${paymentId}/refund`, {
    method: "POST",
    body,
    headers: { "Idempotency-Key": idempotencyKey },
  })

export const listReturns = (
  p: { status?: string; page: number; limit: number },
  signal?: AbortSignal
) => apiPaged<AdminOrder>("/admin/returns", { query: p, signal })
export const decideReturn = (
  id: string,
  decision: "approve" | "reject",
  note?: string
) =>
  api<AdminOrder>(`/admin/returns/${id}/decision`, {
    method: "POST",
    body: { decision, note },
  })
export const refundReturn = (id: string, note?: string) =>
  api<AdminOrder>(`/admin/returns/${id}/refund`, {
    method: "POST",
    body: { note },
  })

// Seller mode: read-only, own lines only.
export const listSellerOrders = (
  p: { status?: string; search?: string; page: number; limit: number },
  signal?: AbortSignal
) => apiPaged<SellerOrder>("/seller/orders", { query: p, signal })
export const getSellerOrder = (id: string, signal?: AbortSignal) =>
  api<SellerOrder>(`/seller/orders/${id}`, { signal })
