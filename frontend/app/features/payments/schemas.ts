import { z } from "@/lib/zod"

/** `GET /payments/config` */
export const paymentConfigSchema = z.object({
  configured: z.boolean(),
  provider: z.enum(["razorpay", "mock"]).nullable(),
  keyId: z.string().nullable(),
  mock: z.boolean(),
})

/** `POST /payments/create-order`: exactly what checkout.js needs (amount in PAISE). */
export const checkoutOptionsSchema = z.object({
  paymentId: z.string(),
  orderId: z.string(),
  orderNumber: z.string(),
  provider: z.enum(["razorpay", "mock"]),
  mock: z.boolean(),
  keyId: z.string(),
  providerOrderId: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  prefill: z.object({
    name: z.string(),
    email: z.string(),
    contact: z.string(),
  }),
})
export type CheckoutOptions = z.infer<typeof checkoutOptionsSchema>

export const paymentStatusSchema = z.enum([
  "created",
  "failed",
  "paid",
  "cancelled",
])

/** `GET /payments` row. Money is whole rupees here (only `create-order.amount` is paise). */
export const paymentSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  orderNumber: z.string(),
  provider: z.enum(["razorpay", "mock"]),
  amount: z.number(),
  currency: z.string(),
  status: paymentStatusSchema,
  method: z.string().nullable(),
  attempts: z.number().int(),
  failureReason: z.string().nullable(),
  paidAt: z.string().nullable(),
  refundedAmount: z.number(),
  refunds: z.array(
    z.object({
      amount: z.number(),
      status: z.enum(["pending", "processed", "failed"]),
      reason: z.string().nullable(),
      createdAt: z.string(),
      processedAt: z.string().nullable(),
    })
  ),
  createdAt: z.string(),
})
export type Payment = z.infer<typeof paymentSchema>

/** `POST /payments/mock/pay` */
export const mockPayResultSchema = z.object({
  ok: z.boolean(),
  handler: z
    .object({
      razorpay_payment_id: z.string(),
      razorpay_order_id: z.string(),
      razorpay_signature: z.string(),
    })
    .nullish(),
  error: z
    .object({
      code: z.string(),
      description: z.string(),
      paymentId: z.string(),
    })
    .optional(),
})
export type MockOutcome = "success" | "success_no_callback" | "failure"
