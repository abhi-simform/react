import { api, apiBlob, apiPaginated } from "@/lib/api/client"
import type { Paginated } from "@/lib/api/envelope"
import type { Order, OrderStatus } from "@/types/domain"

import { orderSchema, type PlaceOrderInput } from "./schemas"

/**
 * The REAL orders API (B5). In Stage 9 these two functions were a stub over in-memory data with
 * the same signatures; swapping them changed nothing in the components (that was the point of
 * 9.10). Money is whole rupees, as everywhere in the API.
 */
export type OrdersFilter = { status?: OrderStatus; search?: string }

const PAGE_SIZE = 8

export const getOrders = (
  filter: OrdersFilter,
  page: number,
  signal?: AbortSignal
): Promise<Paginated<Order>> =>
  apiPaginated("/orders", {
    auth: true,
    query: {
      page,
      limit: PAGE_SIZE,
      status: filter.status,
      search: filter.search,
    },
    schema: orderSchema,
    signal,
  })

export const getOrder = (id: string, signal?: AbortSignal): Promise<Order> =>
  api(`/orders/${encodeURIComponent(id)}`, {
    auth: true,
    schema: orderSchema,
    signal,
  })

/**
 * Place an order from the server cart. NON-idempotent by nature, so the `Idempotency-Key` header
 * makes a retry safe: the server returns the FIRST order for a key instead of creating a second.
 */
export const placeOrder = (
  input: PlaceOrderInput,
  idempotencyKey: string
): Promise<Order> =>
  api("/orders", {
    method: "POST",
    auth: true,
    headers: { "Idempotency-Key": idempotencyKey },
    body: input,
    schema: orderSchema,
  })

/** Cancel (only `pending_payment` / `placed`): the server rejects anything else with 409 INVALID_TRANSITION. */
export const cancelOrder = (id: string, reason?: string): Promise<Order> =>
  api(`/orders/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    auth: true,
    body: reason ? { reason } : {},
    schema: orderSchema,
  })

export type ReturnPayload = {
  reason: string
  note?: string
  items: { productId: string; qty: number }[]
  photos: string[]
  pickupAddressId?: string
}

export const requestReturn = (
  id: string,
  payload: ReturnPayload
): Promise<Order> =>
  api(`/orders/${encodeURIComponent(id)}/return`, {
    method: "POST",
    auth: true,
    body: payload,
    schema: orderSchema,
  })

/** The invoice PDF as a Blob (needs the Authorization header, so not a plain link). */
export const getInvoice = (id: string, signal?: AbortSignal) =>
  apiBlob(`/orders/${encodeURIComponent(id)}/invoice`, { signal })
