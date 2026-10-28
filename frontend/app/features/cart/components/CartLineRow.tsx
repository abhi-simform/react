import { Link } from "react-router"

import { QuantityStepper } from "@/components/common/QuantityStepper"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format"
import { paths } from "@/lib/paths"

import { useCartUi } from "../cartUiStore"
import type { CartLineView } from "../useCart"

type Actions = {
  setQty: (productId: string, qty: number) => void
  remove: (productId: string) => void
  saveForLater: (productId: string) => void
  moveToCart: (productId: string) => void
  dismissMessage: (productId: string) => void
}

const MAX_PER_LINE = 10

/**
 * One line of the SERVER cart. The warnings come from the API on every read: `outOfStock`,
 * `qtyReduced` (you have more than is left) and `priceChanged`; a 409 from a mutation adds the
 * server's sentence as a banner on THIS line (client UI state, cleared by the next success).
 */
export function CartLineRow({
  line,
  actions,
  saved = false,
}: {
  line: CartLineView
  actions: Actions
  saved?: boolean
}) {
  const message = useCartUi((s) => s.lineMessages[line.productId])
  const max = Math.max(1, Math.min(line.availableQty, MAX_PER_LINE))
  const atMax = !saved && line.qty >= max && line.availableQty > 0
  return (
    <li className="flex gap-3 border-b py-3">
      {line.imageUrl ? (
        <img
          src={line.imageUrl}
          alt=""
          width={64}
          height={64}
          className="size-16 rounded object-cover"
        />
      ) : (
        <div aria-hidden className="size-16 rounded bg-neutral-100" />
      )}
      <div className="flex flex-1 flex-col gap-1 text-sm">
        <Link to={paths.product(line.slug)} className="font-medium underline">
          {line.name}
        </Link>
        <p>{formatCurrency(line.unitPrice)} each</p>
        {line.priceChanged && (
          <p role="status" className="text-xs text-amber-700">
            Price changed from {formatCurrency(line.previousPrice)} to{" "}
            {formatCurrency(line.unitPrice)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {saved ? (
            <span>Qty {line.qty}</span>
          ) : (
            <QuantityStepper
              value={line.qty}
              max={max}
              label={`Quantity of ${line.name}`}
              onValueChange={(qty) => actions.setQty(line.productId, qty)}
            />
          )}
          {saved ? (
            <Button
              variant="outline"
              size="sm"
              disabled={line.outOfStock}
              onClick={() => actions.moveToCart(line.productId)}
            >
              Move to cart
              <span className="sr-only"> {line.name}</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.saveForLater(line.productId)}
            >
              Save for later
              <span className="sr-only"> {line.name}</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => actions.remove(line.productId)}
          >
            Remove
            <span className="sr-only"> {line.name}</span>
          </Button>
        </div>
        {line.outOfStock && (
          <p role="alert" className="text-xs text-red-700">
            Out of stock:{" "}
            {saved
              ? "you can still keep it saved"
              : "remove it or save it for later to check out"}
          </p>
        )}
        {!saved && line.qtyReduced && (
          <p role="alert" className="text-xs text-red-700">
            Only {line.availableQty} left, you have {line.qty} in your cart.
            Lower the quantity to check out.
          </p>
        )}
        {atMax && !line.qtyReduced && (
          <p role="status" className="text-xs text-amber-700">
            Maximum available: {max}
          </p>
        )}
        {message && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded bg-amber-100 p-1 text-xs text-amber-900"
          >
            {message}
            <button
              type="button"
              className="underline"
              onClick={() => actions.dismissMessage(line.productId)}
            >
              Dismiss
            </button>
          </p>
        )}
      </div>
      <p className="text-sm font-medium">
        {formatCurrency(
          line.unitPrice *
            (saved ? line.qty : Math.min(line.qty, line.availableQty))
        )}
      </p>
    </li>
  )
}
