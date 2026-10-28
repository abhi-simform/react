import { z } from "zod"

/** Coupon box (7.2). The code is normalised (trim + upper-case) before the server sees it. */
export const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(4, { error: "Coupon codes have at least 4 characters" })
    .max(20, { error: "Coupon codes have at most 20 characters" })
    .regex(/^[A-Z0-9]+$/, { error: "Use letters and numbers only" }),
})
export type CouponValues = z.output<typeof couponSchema>

// ---- the server cart (B3), see backend/docs/API-CONVENTIONS.md "Cart (B3)" -----------------
// Money here is whole RUPEES, exactly as the API sends it; `useCart` converts to paise.

export const serverCartLineSchema = z.object({
  productId: z.string(),
  sku: z.string(),
  slug: z.string(),
  name: z.string(),
  brand: z.string(),
  imageUrl: z.string().nullable(),
  qty: z.number().int().min(1),
  unitPrice: z.number().nonnegative(),
  mrp: z.number().nonnegative(),
  availableQty: z.number().int().nonnegative(),
  payableQty: z.number().int().nonnegative(),
  outOfStock: z.boolean(),
  qtyReduced: z.boolean(),
  priceChanged: z.boolean(),
  previousPrice: z.number().nonnegative(),
  /** A live deal (B4) is why `unitPrice` is below the regular price. */
  deal: z
    .object({ id: z.string(), dealPrice: z.number(), endsAt: z.string() })
    .nullable(),
  savedForLater: z.boolean(),
  addedAt: z.string(),
})

/** The applied coupon: a discount, or (after it stopped applying) the reason why not. */
export const cartCouponSchema = z.union([
  z.object({
    code: z.string(),
    description: z.string(),
    discount: z.number().nonnegative(),
  }),
  z.object({
    code: z.string(),
    error: z.object({ reason: z.string(), message: z.string() }).loose(),
  }),
])

export const serverCartSchema = z.object({
  items: z.array(serverCartLineSchema),
  saved: z.array(serverCartLineSchema),
  totals: z.object({
    lineCount: z.number().int(),
    unitCount: z.number().int(),
    subtotal: z.number(),
    mrpTotal: z.number(),
    savings: z.number(),
    /** B4: the server owns the whole price (coupon, shipping, GST), whole rupees. */
    discount: z.number(),
    shipping: z.number(),
    tax: z.number(),
    total: z.number(),
  }),
  coupon: cartCouponSchema.nullable(),
  hasIssues: z.boolean(),
  updatedAt: z.string().nullable(),
})

export const mergeResultSchema = serverCartSchema.extend({
  merge: z.object({
    merged: z.number().int(),
    adjusted: z.array(
      z.object({
        productId: z.string(),
        name: z.string(),
        requested: z.number(),
        applied: z.number(),
      })
    ),
    skipped: z.array(
      z.object({ productId: z.string(), name: z.string(), reason: z.string() })
    ),
  }),
})

export const availableCouponSchema = z.object({
  code: z.string(),
  description: z.string(),
  type: z.enum(["percent", "flat"]),
  value: z.number(),
  maxDiscount: z.number().nullable(),
  minOrder: z.number(),
  expiresAt: z.string().nullable(),
  applicable: z.boolean(),
  discount: z.number(),
  reason: z.string().nullable(),
  message: z.string().nullable(),
})
export type AvailableCoupon = z.infer<typeof availableCouponSchema>
export type CartCoupon = z.infer<typeof cartCouponSchema>

export type ServerCartLine = z.infer<typeof serverCartLineSchema>
export type ServerCart = z.infer<typeof serverCartSchema>
export type MergeResult = z.infer<typeof mergeResultSchema>

export const EMPTY_CART: ServerCart = {
  items: [],
  saved: [],
  totals: {
    lineCount: 0,
    unitCount: 0,
    subtotal: 0,
    mrpTotal: 0,
    savings: 0,
    discount: 0,
    shipping: 0,
    tax: 0,
    total: 0,
  },
  coupon: null,
  hasIssues: false,
  updatedAt: null,
}
