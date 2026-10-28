import type {
  CartLine,
  CartTotals,
  CouponRule,
  ShippingRules,
} from "./types.ts"

export const DEFAULT_SHIPPING_RULES: ShippingRules = {
  freeAbove: 499_00,
  fee: 40_00,
}

export const TAX_PERCENT = 18

type Options = {
  coupon?: CouponRule
  shippingRules?: ShippingRules
}

/**
 * Totals are DERIVED data: computed from lines every time, never stored.
 * Everything is integer paise. Each derived amount is rounded exactly once
 * (percent discount, tax), so the parts always add up to the total.
 */
export function computeTotals(
  lines: readonly CartLine[],
  { coupon, shippingRules = DEFAULT_SHIPPING_RULES }: Options = {}
): CartTotals {
  // Explicit initial value: reduce() on an empty array WITHOUT one throws a TypeError.
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0)
  const listTotal = lines.reduce(
    (sum, l) => sum + (l.mrp ?? l.unitPrice) * l.qty,
    0
  )

  const discount = couponDiscount(subtotal, coupon)
  const discounted = subtotal - discount

  // Empty cart ships nothing. "Free above 499" is strict and uses the discounted subtotal.
  const shipping =
    lines.length === 0 || discounted > shippingRules.freeAbove
      ? 0
      : shippingRules.fee
  const tax = Math.round((discounted * TAX_PERCENT) / 100)
  const total = discounted + shipping + tax
  const savings = listTotal - subtotal + discount

  return { subtotal, discount, shipping, tax, total, savings }
}

function couponDiscount(
  subtotal: number,
  coupon: CouponRule | undefined
): number {
  if (!coupon || subtotal === 0) return 0
  if (coupon.minOrder !== undefined && subtotal < coupon.minOrder) return 0

  const raw =
    coupon.type === "percent"
      ? Math.round((subtotal * coupon.value) / 100)
      : coupon.value
  const capped =
    coupon.maxDiscount !== undefined ? Math.min(raw, coupon.maxDiscount) : raw
  // A coupon can never make the subtotal negative.
  return Math.min(capped, subtotal)
}
