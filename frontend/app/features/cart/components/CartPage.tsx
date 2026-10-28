import { ShoppingCart } from "lucide-react"
import { Link } from "react-router"

import { EmptyState } from "@/components/common/EmptyState"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format"
import { usePersistHydrated } from "@/lib/persistSync"
import { paths } from "@/lib/paths"

import { selectLines, useCartStore, useCartTotals } from "../cartStore"
import { CartLineRow } from "./CartLineRow"
import { CouponBox } from "./CouponBox"
import { FreeShippingBar } from "./FreeShippingBar"

/** `/cart` (guest cart from the UI store). Totals are derived on every render from `lines`. */
export function CartPage() {
  const hydrated = usePersistHydrated(useCartStore.persist)
  const lines = useCartStore(selectLines)
  const totals = useCartTotals()

  if (!hydrated) {
    return (
      <div className="p-4" aria-busy="true">
        <h1 className="text-xl font-medium">Your cart</h1>
        <p role="status">Loading your cart...</p>
      </div>
    )
  }
  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <h1 className="mb-3 text-xl font-medium">Your cart</h1>
        <EmptyState
          icon={<ShoppingCart className="size-8" />}
          title="Your cart is empty"
          description="Add something you like and it will wait here."
          action={
            <Link className="underline" to={paths.products()}>
              Browse products
            </Link>
          }
        />
      </div>
    )
  }
  return (
    <div className="mx-auto grid max-w-5xl gap-6 p-4 md:grid-cols-[1fr_20rem]">
      <section aria-label="Cart items">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-xl font-medium">Your cart ({lines.length})</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => useCartStore.getState().clear()}
          >
            Clear cart
          </Button>
        </div>
        <FreeShippingBar subtotal={totals.subtotal} />
        <ul>
          {lines.map((line) => (
            <CartLineRow key={line.sku} line={line} />
          ))}
        </ul>
      </section>
      <aside aria-label="Order summary" className="flex flex-col gap-3">
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
          <dt>Subtotal</dt>
          <dd>{formatCurrency(totals.subtotal)}</dd>
          {totals.savings > 0 && (
            <>
              <dt>You save</dt>
              <dd>{formatCurrency(totals.savings)}</dd>
            </>
          )}
          <dt>Shipping</dt>
          <dd>
            {totals.shipping === 0 ? "Free" : formatCurrency(totals.shipping)}
          </dd>
          <dt>Tax (GST)</dt>
          <dd>{formatCurrency(totals.tax)}</dd>
          <dt className="border-t pt-1 font-medium">Total</dt>
          <dd className="border-t pt-1 font-medium">
            {formatCurrency(totals.total)}
          </dd>
        </dl>
        <CouponBox lines={lines} />
        <Button nativeButton={false} render={<Link to={paths.checkout()} />}>
          Proceed to checkout
        </Button>
      </aside>
    </div>
  )
}
