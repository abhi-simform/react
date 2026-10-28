import type { CartTotals } from "@/features/cart"

import { EXPRESS_FEE } from "./slots"

/** The server charges COD only up to this order total (backend `COD_MAX_TOTAL`), in paise. */
export const COD_MAX_TOTAL = 50_000_00

/**
 * The cart's server totals plus the delivery choice. Express is a flat fee that REPLACES the
 * standard shipping charge (same rule as the backend's `priceOrder`), so the total is derived
 * from the server's total, not recomputed from scratch.
 */
export function withDelivery(
  totals: CartTotals,
  method: "standard" | "express"
) {
  const shipping = method === "express" ? EXPRESS_FEE : totals.shipping
  return {
    ...totals,
    shipping,
    total: totals.total - totals.shipping + shipping,
  }
}
