import { Link } from "react-router"

import { QuantityStepper } from "@/components/common/QuantityStepper"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format"
import { paths } from "@/lib/paths"

import { useCartStore } from "../cartStore"
import { removeCartLine } from "../undo"
import type { GuestCartLine } from "../types"

/**
 * One line. Actions come from `getState()`: the row re-renders when ITS line object changes
 * (the reducer-style updates keep untouched lines referentially equal), not when the cart does.
 */
export function CartLineRow({ line }: { line: GuestCartLine }) {
  const atStock = line.qty >= line.stock
  return (
    <li className="flex gap-3 border-b py-3">
      <img
        src={line.imageUrl}
        alt=""
        width={64}
        height={64}
        className="size-16 rounded object-cover"
      />
      <div className="flex flex-1 flex-col gap-1 text-sm">
        <Link to={paths.product(line.slug)} className="font-medium underline">
          {line.name}
        </Link>
        <p>{formatCurrency(line.unitPrice)} each</p>
        <div className="flex flex-wrap items-center gap-2">
          <QuantityStepper
            value={line.qty}
            max={line.stock}
            label={`Quantity of ${line.name}`}
            onValueChange={(qty) =>
              useCartStore.getState().setQty(line.sku, qty)
            }
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => removeCartLine(line.sku)}
          >
            Remove
            <span className="sr-only"> {line.name}</span>
          </Button>
        </div>
        {atStock && (
          <p role="status" className="text-xs text-amber-700">
            Maximum available: {line.stock}
          </p>
        )}
      </div>
      <p className="text-sm font-medium">
        {formatCurrency(line.unitPrice * line.qty)}
      </p>
    </li>
  )
}
