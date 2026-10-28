import { api, apiPaginated } from "@/lib/api/client"
import type { Paginated } from "@/lib/api/envelope"

import {
  checkoutOptionsSchema,
  mockPayResultSchema,
  paymentConfigSchema,
  paymentSchema,
  type CheckoutOptions,
  type MockOutcome,
  type Payment,
} from "./schemas"

export const getPaymentConfig = (signal?: AbortSignal) =>
  api("/payments/config", { schema: paymentConfigSchema, signal })

/**
 * Step 1: ask OUR server for a provider order. Idempotent on the server: a retry for the same
 * order returns the same `providerOrderId` (no orphaned Razorpay orders).
 */
export const createPaymentOrder = (orderId: string): Promise<CheckoutOptions> =>
  api("/payments/create-order", {
    method: "POST",
    auth: true,
    body: { orderId },
    schema: checkoutOptionsSchema,
  })

/** Step 3: forward the checkout handler's three fields. The SERVER verifies the HMAC signature. */
export const verifyPayment = (
  orderId: string,
  response: RazorpaySuccessResponse
): Promise<void> =>
  // The response is the updated order, but this feature does not own that shape: the caller
  // refetches the order through the orders feature's own query (single source of truth).
  api("/payments/verify", {
    method: "POST",
    auth: true,
    body: { orderId, ...response },
  }).then(() => undefined)

export const getPayments = (
  page: number,
  filter: { orderId?: string } = {},
  signal?: AbortSignal
): Promise<Paginated<Payment>> =>
  apiPaginated("/payments", {
    auth: true,
    query: { page, limit: 10, orderId: filter.orderId },
    schema: paymentSchema,
    signal,
  })

/** Mock gateway only: what the fake "modal" does. */
export const mockPay = (orderId: string, outcome: MockOutcome) =>
  api("/payments/mock/pay", {
    method: "POST",
    auth: true,
    body: { orderId, outcome, method: "card" },
    schema: mockPayResultSchema,
  })
