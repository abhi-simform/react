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
