import { useWatch } from "react-hook-form"

import { formatCurrency } from "@/lib/format"

import { useCheckoutCart } from "../cartContext"
import type { CheckoutInput } from "../schemas"
import { withDelivery } from "../totals"

/**
 * Sticky summary. Money is paise, but every NUMBER is the server's (cart totals incl. coupon and
 * GST, 11.1): only the delivery choice is applied on top (express replaces the standard fee).
 */
export function OrderSummary() {
  const method = useWatch<CheckoutInput, "method">({ name: "method" })
  const { totals: cartTotals, lines } = useCheckoutCart()
  const totals = withDelivery(
    cartTotals,
    method === "express" ? "express" : "standard"
  )
  return (
    <>
      <h2 className="mb-2 font-medium">Order summary</h2>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
        <dt>Subtotal</dt>
        <dd>{formatCurrency(totals.subtotal)}</dd>
        {totals.discount > 0 && (
          <>
            <dt>Discount</dt>
            <dd>-{formatCurrency(totals.discount)}</dd>
          </>
        )}
        <dt>{method === "express" ? "Express delivery" : "Shipping"}</dt>
        <dd>
          {totals.shipping === 0 ? "Free" : formatCurrency(totals.shipping)}
        </dd>
        <dt>Tax (GST)</dt>
        <dd>{formatCurrency(totals.tax)}</dd>
        <dt className="border-t pt-1 font-medium">Total</dt>
        <dd className="border-t pt-1 font-medium" data-testid="checkout-total">
          {formatCurrency(totals.total)}
        </dd>
      </dl>
      {totals.savings > 0 && (
        <p className="mt-2 text-xs text-success">
          You save {formatCurrency(totals.savings)} on this order
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {lines.length} {lines.length === 1 ? "line" : "lines"} from your cart.
      </p>
    </>
  )
}
