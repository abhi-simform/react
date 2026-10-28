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
  savedForLater: z.boolean(),
  addedAt: z.string(),
})

export const serverCartSchema = z.object({
  items: z.array(serverCartLineSchema),
  saved: z.array(serverCartLineSchema),
  totals: z.object({
    lineCount: z.number().int(),
    unitCount: z.number().int(),
    subtotal: z.number(),
    mrpTotal: z.number(),
    savings: z.number(),
  }),
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

export type ServerCartLine = z.infer<typeof serverCartLineSchema>
export type ServerCart = z.infer<typeof serverCartSchema>
export type MergeResult = z.infer<typeof mergeResultSchema>

export const EMPTY_CART: ServerCart = {
  items: [],
  saved: [],
  totals: { lineCount: 0, unitCount: 0, subtotal: 0, mrpTotal: 0, savings: 0 },
  hasIssues: false,
  updatedAt: null,
}
