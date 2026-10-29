import {
  Schema,
  model,
  Types,
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose"

export const PAYMENT_STATUSES = [
  "created", // provider order exists, nothing paid yet
  "failed", // last attempt failed; the same provider order can be paid again
  "paid", // captured (verified signature or webhook)
  "cancelled", // the order was cancelled before payment
] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

const refundSchema = new Schema(
  {
    providerRefundId: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 }, // whole rupees
    status: { type: String, enum: ["pending", "processed", "failed"], required: true },
    reason: String,
    // The Idempotency-Key of the admin request that created this refund: a retry with the same key replays it.
    idempotencyKey: String,
    createdAt: { type: Date, default: () => new Date() },
    processedAt: Date,
  },
  { _id: false }
)

/**
 * One Payment per online order. Razorpay lets a failed order be paid again, so retries reuse the
 * same provider order (no orphaned orders) and just bump `attempts`.
 */
const paymentSchema = new Schema(
  {
    order: { type: Types.ObjectId, ref: "Order", required: true, unique: true },
    user: { type: Types.ObjectId, ref: "User", required: true },
    orderNumber: { type: String, required: true },
    provider: { type: String, enum: ["razorpay", "mock"], required: true },
    providerOrderId: { type: String, required: true, unique: true },
    providerPaymentId: { type: String, index: true, sparse: true },
    amount: { type: Number, required: true, min: 0 }, // whole rupees (the provider gets paise)
    currency: { type: String, default: "INR" },
    status: { type: String, enum: PAYMENT_STATUSES, default: "created" },
    method: String, // card | upi | netbanking | wallet ... as reported by the provider
    attempts: { type: Number, default: 0 },
    failureCode: String,
    failureReason: String,
    signatureVerifiedAt: Date,
    paidAt: Date,
    refundedAmount: { type: Number, default: 0 },
    refunds: { type: [refundSchema], default: [] },
  },
  { timestamps: true }
)
paymentSchema.index({ user: 1, createdAt: -1, _id: -1 })
paymentSchema.index({ status: 1, createdAt: -1 })

export type PaymentDoc = HydratedDocument<InferSchemaType<typeof paymentSchema>>
export const Payment = model("Payment", paymentSchema)

/** Webhooks are delivered at least once: the provider's event id makes handling idempotent. */
const webhookEventSchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true },
    type: String,
    receivedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false }
)
export const WebhookEvent = model("WebhookEvent", webhookEventSchema)

export function toPublicPayment(
  p:
    | PaymentDoc
    | (InferSchemaType<typeof paymentSchema> & { _id: unknown; createdAt: Date })
) {
  return {
    id: String(p._id),
    orderId: String(p.order),
    orderNumber: p.orderNumber,
    provider: p.provider,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    method: p.method ?? null,
    attempts: p.attempts,
    failureReason: p.failureReason ?? null,
    paidAt: p.paidAt ?? null,
    refundedAmount: p.refundedAmount,
    refunds: p.refunds.map((r) => ({
      amount: r.amount,
      status: r.status,
      reason: r.reason ?? null,
      createdAt: r.createdAt,
      processedAt: r.processedAt ?? null,
    })),
    createdAt: p.createdAt,
  }
}
