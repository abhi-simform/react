import { z } from "zod"
import { ORDER_STATUSES } from "./order.model.js"

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")

/** The `Idempotency-Key` header: a client-generated id (`crypto.randomUUID()`) per checkout attempt. */
export const idempotencyKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,100}$/, "Idempotency-Key must be 8-100 url-safe characters")

export const SLOT_RE = /^\d{4}-\d{2}-\d{2}\|(9-12|12-16|16-20)$/

export const placeOrderSchema = {
  body: z.object({
    addressId: objectId,
    paymentMethod: z.enum(["cod", "razorpay"]),
    deliveryMethod: z.enum(["standard", "express"]).default("standard"),
    deliverySlot: z
      .string()
      .regex(SLOT_RE, "Use YYYY-MM-DD|9-12 (or 12-16, 16-20)")
      .optional(),
    /** What the shopper saw (whole rupees). A mismatch is `409 PRICE_CHANGED`, not a silent surprise. */
    expectedTotal: z.number().int().min(0).optional(),
  }),
}

export const orderIdSchema = { params: z.object({ id: objectId }) }

export const listOrdersSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(ORDER_STATUSES).optional(),
    search: z.string().trim().min(1).max(40).optional(),
  }),
}

export const cancelOrderSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ reason: z.string().trim().min(3).max(300).optional() }).default({}),
}

export const RETURN_REASONS = [
  "DAMAGED",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "NO_LONGER_NEEDED",
  "OTHER",
] as const
export const returnOrderSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    reason: z.enum(RETURN_REASONS),
    note: z.string().trim().max(500).optional(),
  }),
}

export const adminStatusSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.enum(ORDER_STATUSES),
    note: z.string().trim().max(300).optional(),
  }),
}
