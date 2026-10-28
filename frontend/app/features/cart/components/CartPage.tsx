import { ShoppingCart } from "lucide-react"
import { Link } from "react-router"

import { AsyncView } from "@/components/common/AsyncView"
import { EmptyState } from "@/components/common/EmptyState"
import { ListSkeleton } from "@/components/common/Skeletons"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format"
import { paths } from "@/lib/paths"

import { useCart } from "../useCart"
import { CartLineRow } from "./CartLineRow"
import { CouponBox } from "./CouponBox"
import { FreeShippingBar } from "./FreeShippingBar"

/** `/cart`: the server cart (guest by token, user by JWT) through the `useCart` facade. */
export function CartPage() {
  const cart = useCart()
  const { totals, lines, saved } = cart

  return (
    <div className="mx-auto max-w-5xl p-4">
      <AsyncView
        state={cart.state}
        loading={<ListSkeleton rows={3} label="Loading your cart" />}
      >
        {() =>
          lines.length === 0 && saved.length === 0 ? (
            <div className="mx-auto max-w-3xl">
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
          ) : (
            <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
              <section aria-label="Cart items">
                <div className="mb-2 flex items-center justify-between">
                  <h1 className="text-xl font-medium">
                    Your cart ({lines.length})
                  </h1>
                  <Button variant="outline" size="sm" onClick={cart.clear}>
                    Clear cart
                  </Button>
                </div>
                {cart.issueCount > 0 && (
                  <p
                    role="alert"
                    className="mb-2 rounded bg-red-50 p-2 text-sm text-red-800"
                  >
                    {cart.issueCount}{" "}
                    {cart.issueCount === 1 ? "item needs" : "items need"} your
                    attention before checkout.
                  </p>
                )}
                <FreeShippingBar subtotal={totals.subtotal} />
                {lines.length === 0 ? (
                  <p className="py-3 text-sm">
                    Nothing in your cart right now.
                  </p>
                ) : (
                  <ul>
                    {lines.map((line) => (
                      <CartLineRow
                        key={line.productId}
                        line={line}
                        actions={cart}
                      />
                    ))}
                  </ul>
                )}
                {saved.length > 0 && (
                  <section aria-labelledby="saved-title" className="mt-6">
                    <h2 id="saved-title" className="font-medium">
                      Saved for later ({saved.length})
                    </h2>
                    <ul>
                      {saved.map((line) => (
                        <CartLineRow
                          key={line.productId}
                          line={line}
                          actions={cart}
                          saved
                        />
                      ))}
                    </ul>
                  </section>
                )}
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
                    {totals.shipping === 0
                      ? "Free"
                      : formatCurrency(totals.shipping)}
                  </dd>
                  <dt>Tax (GST)</dt>
                  <dd>{formatCurrency(totals.tax)}</dd>
                  <dt className="border-t pt-1 font-medium">Total</dt>
                  <dd className="border-t pt-1 font-medium">
                    {formatCurrency(totals.total)}
                  </dd>
                </dl>
                <CouponBox lines={cart.totalsLines} />
                <Button
                  nativeButton={false}
                  disabled={lines.length === 0 || cart.issueCount > 0}
                  render={<Link to={paths.checkout()} />}
                >
                  Proceed to checkout
                </Button>
              </aside>
            </div>
          )
        }
      </AsyncView>
    </div>
  )
}
