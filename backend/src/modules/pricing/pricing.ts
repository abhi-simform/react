// Money rules shared by the cart view and order placement, so the number the shopper saw in the
// cart is the number the order is created with. Whole rupees everywhere.
export const FREE_SHIPPING_ABOVE = 499 // strictly above (on the discounted subtotal)
export const SHIPPING_FEE = 40
export const EXPRESS_FEE = 99
export const TAX_PERCENT = 18
/** Cash on delivery is refused above this order total (fraud/handling-cost guard). */
export const COD_MAX_TOTAL = 50_000

export type DeliveryMethod = "standard" | "express"

/** Totals from the (already coupon-reduced) numbers. Tax is exclusive and rounded once. */
export function priceOrder(
  subtotal: number,
  discount: number,
  method: DeliveryMethod = "standard"
) {
  const discounted = Math.max(0, subtotal - discount)
  const shipping =
    subtotal === 0
      ? 0
      : method === "express"
        ? EXPRESS_FEE
        : discounted > FREE_SHIPPING_ABOVE
          ? 0
          : SHIPPING_FEE
  const tax = Math.round((discounted * TAX_PERCENT) / 100)
  return { subtotal, discount, shipping, tax, total: discounted + shipping + tax }
}
