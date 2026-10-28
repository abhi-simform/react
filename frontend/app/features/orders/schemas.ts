import { z } from "zod"

import type { Order } from "@/types/domain"

const orderStatusSchema = z.enum([
  "pending_payment",
  "placed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "return_requested",
  "returned",
  "refunded",
])

const money = z.number()

/**
 * `GET /orders` / `GET /orders/:id` (B5), mapped to the app's `Order` (`id` -> `_id`, nulls ->
 * absent) at this boundary, so components never change when the stub became the real API (9.10).
 */
export const orderSchema = z
  .object({
    id: z.string(),
    orderNumber: z.string(),
    userId: z.string(),
    items: z.array(
      z.object({
        productId: z.string(),
        sku: z.string(),
        title: z.string(),
        image: z.string().nullable(),
        unitPrice: money,
        mrp: money,
        qty: z.number().int(),
        lineTotal: money,
        deal: z.boolean(),
      })
    ),
    addressSnapshot: z.object({
      fullName: z.string(),
      phone: z.string(),
      line1: z.string(),
      line2: z.string().nullish(),
      landmark: z.string().nullish(),
      city: z.string(),
      state: z.string(),
      pincode: z.string(),
      type: z.enum(["home", "work", "other"]),
    }),
    delivery: z
      .object({
        method: z.enum(["standard", "express"]),
        slot: z.string().nullish(),
        estimatedFrom: z.string().nullish(),
        estimatedTo: z.string().nullish(),
      })
      .nullish(),
    status: orderStatusSchema,
    statusHistory: z.array(
      z.object({
        status: orderStatusSchema,
        at: z.string(),
        note: z.string().nullable(),
      })
    ),
    pricing: z.object({
      subtotal: money,
      discount: money,
      shipping: money,
      tax: money,
      total: money,
    }),
    coupon: z.object({ code: z.string(), discount: money }).nullable(),
    paymentMethod: z.enum(["cod", "razorpay"]),
    paymentStatus: z.string(),
    cancelReason: z.string().nullable(),
    createdAt: z.string(),
  })
  .transform((o): Order => ({
    _id: o.id,
    orderNumber: o.orderNumber,
    userId: o.userId,
    items: o.items.map((i) => ({
      sku: i.sku,
      productId: i.productId,
      title: i.title,
      image: i.image ?? "/placeholder.svg",
      unitPrice: i.unitPrice,
      qty: i.qty,
      lineTotal: i.lineTotal,
      deal: i.deal,
    })),
    addressSnapshot: {
      fullName: o.addressSnapshot.fullName,
      phone: o.addressSnapshot.phone,
      line1: o.addressSnapshot.line1,
      line2: o.addressSnapshot.line2 ?? undefined,
      city: o.addressSnapshot.city,
      state: o.addressSnapshot.state,
      pincode: o.addressSnapshot.pincode,
      type: o.addressSnapshot.type,
    },
    status: o.status,
    statusHistory: o.statusHistory.map((h) => ({
      status: h.status,
      at: h.at,
      note: h.note ?? undefined,
    })),
    pricing: o.pricing,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    coupon: o.coupon ?? undefined,
    delivery: o.delivery
      ? {
          method: o.delivery.method,
          slot: o.delivery.slot ?? undefined,
          estimatedFrom: o.delivery.estimatedFrom ?? undefined,
          estimatedTo: o.delivery.estimatedTo ?? undefined,
        }
      : undefined,
    cancelReason: o.cancelReason ?? undefined,
    createdAt: o.createdAt,
  }))

/** What `POST /orders` needs (the checkout form's values, in the API's words). */
export type PlaceOrderInput = {
  addressId: string
  paymentMethod: "cod" | "razorpay"
  deliveryMethod: "standard" | "express"
  deliverySlot?: string
  /** Whole rupees the shopper saw: a mismatch is `409 PRICE_CHANGED`. */
  expectedTotal: number
}
