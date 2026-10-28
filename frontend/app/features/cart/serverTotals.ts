import { DEFAULT_SHIPPING_RULES, TAX_PERCENT } from "./totals"

/**
 * The server's pricing rules in WHOLE RUPEES (backend `modules/pricing/pricing.ts`), used ONLY to
 * keep the cached cart plausible while an optimistic edit is in flight. The server is the
 * authority: its response replaces these numbers, and the order total is checked against it
 * (`expectedTotal`). Rounding is per rupee here (like the server), not per paise like
 * `computeTotals`, so the two can differ by a rupee: never mix them on one screen.
 */
export function priceTotals(subtotal: number, discount: number) {
  const discounted = Math.max(0, subtotal - discount)
  const freeAbove = DEFAULT_SHIPPING_RULES.freeAbove / 100
  const shipping =
    subtotal === 0
      ? 0
      : discounted > freeAbove
        ? 0
        : DEFAULT_SHIPPING_RULES.fee / 100
  const tax = Math.round((discounted * TAX_PERCENT) / 100)
  return { shipping, tax, total: discounted + shipping + tax }
}
