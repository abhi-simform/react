import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format"

import { useCart, useCartIssues } from "../useCart"

/**
 * The cart's checkout blockers (11.1), listed in one place. The data is derived by `select`
 * (`useCartIssues`), the flags come from the API on every read:
 * - out of stock / not enough left: must be fixed (remove, save for later, lower the quantity)
 * - price changed: shown as "from a to b" and must be ACKNOWLEDGED (`POST /cart/acknowledge-prices`)
 */
export function CartIssues() {
  const issues = useCartIssues()
  const { acknowledgePrices, isPending } = useCart()
  if (!issues.blocking) return null
  return (
    <div
      role="alert"
      data-testid="cart-issues"
      className="mb-2 rounded border border-destructive/50 bg-destructive-muted p-2 text-sm text-destructive"
    >
      <p className="font-medium">Fix these before you check out</p>
      <ul className="list-disc ps-5">
        {issues.outOfStock.map((i) => (
          <li key={`o-${i.productId}`}>{i.name} is out of stock.</li>
        ))}
        {issues.qtyReduced.map((i) => (
          <li key={`q-${i.productId}`}>
            Only {i.availableQty} of {i.name} left (you have {i.qty}).
          </li>
        ))}
        {issues.priceChanged.map((i) => (
          <li key={`p-${i.productId}`}>
            {i.name}: price changed from {formatCurrency(i.from)} to{" "}
            {formatCurrency(i.to)}.
          </li>
        ))}
      </ul>
      {issues.priceChanged.length > 0 && (
        <Button
          type="button"
          size="sm"
          className="mt-1"
          disabled={isPending}
          onClick={() => void acknowledgePrices()}
        >
          Accept new prices
        </Button>
      )}
    </div>
  )
}
