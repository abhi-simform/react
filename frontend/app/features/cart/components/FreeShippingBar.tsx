import { formatCurrency } from "@/lib/format"

import { freeShippingProgress } from "../totals"

/** "Add Rs 121 more for free delivery". Derived from the subtotal on every render. */
export function FreeShippingBar({ subtotal }: { subtotal: number }) {
  const { remaining, ratio, qualified } = freeShippingProgress(subtotal)
  if (subtotal === 0) return null
  return (
    <div className="text-sm">
      <p>
        {qualified
          ? "You get free delivery."
          : `Add ${formatCurrency(remaining)} more for free delivery`}
      </p>
      <progress
        className="w-full"
        max={100}
        value={Math.round(ratio * 100)}
        aria-label="Progress to free delivery"
      />
    </div>
  )
}
