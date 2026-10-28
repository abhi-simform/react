import { useWatch } from "react-hook-form"

import { computeTotals, type CartLine } from "@/features/cart"
import { formatCurrency } from "@/lib/format"

import { EXPRESS_FEE } from "../slots"
import type { CheckoutInput } from "../schemas"

/** Sticky summary. Money is paise (`computeTotals` from Stage 1); the express fee follows the form. */
export function OrderSummary({ lines }: { lines: readonly CartLine[] }) {
  const method = useWatch<CheckoutInput, "method">({ name: "method" })
  const totals = computeTotals(lines)
  const express = method === "express" ? EXPRESS_FEE : 0
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
        <dt>Shipping</dt>
        <dd>
          {totals.shipping === 0 ? "Free" : formatCurrency(totals.shipping)}
        </dd>
        {express > 0 && (
          <>
            <dt>Express delivery</dt>
            <dd>{formatCurrency(express)}</dd>
          </>
        )}
        <dt>Tax (GST)</dt>
        <dd>{formatCurrency(totals.tax)}</dd>
        <dt className="border-t pt-1 font-medium">Total</dt>
        <dd className="border-t pt-1 font-medium">
          {formatCurrency(totals.total + express)}
        </dd>
      </dl>
      <p className="mt-2 text-xs text-neutral-500">
        {lines.length} {lines.length === 1 ? "line" : "lines"} from your cart.
      </p>
    </>
  )
}
