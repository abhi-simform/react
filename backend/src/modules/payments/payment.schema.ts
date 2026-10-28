import { z } from "zod"
import { PAYMENT_STATUSES } from "./payment.model.js"

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")

export const createPaymentOrderSchema = { body: z.object({ orderId: objectId }) }

/** Field names are Razorpay's own (what its checkout `handler` receives), so the client forwards them as-is. */
export const verifyPaymentSchema = {
  body: z.object({
    orderId: objectId,
    razorpay_order_id: z.string().min(3).max(100),
    razorpay_payment_id: z.string().min(3).max(100),
    razorpay_signature: z.string().min(10).max(200),
  }),
}

export const listPaymentsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(PAYMENT_STATUSES).optional(),
    orderId: objectId.optional(),
  }),
}

export const mockPaySchema = {
  body: z.object({
    orderId: objectId,
    outcome: z.enum(["success", "success_no_callback", "failure"]),
    method: z.enum(["card", "upi", "netbanking", "wallet"]).optional(),
  }),
}

export const simulateWebhookSchema = {
  body: z.object({
    orderId: objectId,
    event: z.enum(["payment.captured", "payment.failed"]),
    paymentId: z.string().min(3).max(60).optional(),
  }),
}

export const refundSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      amount: z.number().int().min(1).optional(), // whole rupees; omitted = everything left
      reason: z.string().trim().min(3).max(200).default("Refund by staff"),
    })
    .default({ reason: "Refund by staff" }),
}
