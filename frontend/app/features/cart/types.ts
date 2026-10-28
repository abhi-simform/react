import type { CartItem } from "@/types/domain"

// All money in the cart layer is integer paise (1 rupee = 100 paise).
export type CartLine = {
  sku: string
  qty: number
  /** price per unit, paise */
  unitPrice: number
  /** list price per unit, paise; used for "you saved" */
  mrp?: number
}

export type CouponRule = {
  type: "percent" | "flat"
  /** percent: 0..100, flat: paise */
  value: number
  /** cap for percent coupons, paise */
  maxDiscount?: number
  /** minimum subtotal for the coupon to apply, paise */
  minOrder?: number
}

export type ShippingRules = {
  /** shipping is free when the discounted subtotal is strictly above this, paise */
  freeAbove: number
  /** shipping fee otherwise, paise */
  fee: number
}

export type CartTotals = {
  subtotal: number
  discount: number
  shipping: number
  tax: number
  total: number
  savings: number
}

/** What the UI sends when adding to the cart: the server decides the price snapshot. */
export type CartItemInput = Omit<CartItem, "priceSnapshot">

/**
 * A line of the GUEST cart (8.3, client state). `CartLine` is what the totals need; the rest is
 * a display snapshot taken when the product was added, because a guest cart has no server to
 * ask. `stock` is the stock at that moment: the clamp uses it, and re-adding refreshes it.
 * Stage 9's logged-in cart is server state and replaces these snapshots with the server's.
 */
export type GuestCartLine = CartLine & {
  productId: string
  slug: string
  name: string
  imageUrl: string
  stock: number
}

/** What a caller hands to `add`: the line without a quantity. */
export type CartLineInput = Omit<GuestCartLine, "qty">

/** Captured by `remove` so an undo can put the line back where it was (8.5). */
export type RemovedLine = {
  line: GuestCartLine
  /** Every sku in the cart, in order, at the moment of removal (includes the removed one). */
  order: readonly string[]
}
