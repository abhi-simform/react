import { useEffect } from "react"
import { Navigate } from "react-router"
import { toast } from "sonner"

import { AsyncView } from "@/components/common/AsyncView"
import { ListSkeleton } from "@/components/common/Skeletons"
import { useCart } from "@/features/cart"
import { CheckoutShell, orderJustPlaced } from "@/features/checkout"
import { paths } from "@/lib/paths"
import { noindexMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

/** Sends the shopper to the cart with a reason (toast once), replacing this history entry. */
function BackToCart({ message }: { message?: string }) {
  useEffect(() => {
    if (message) toast.warning(message, { id: "checkout-to-cart" })
  }, [message])
  return <Navigate to={paths.cart()} replace />
}

export default function CheckoutLayout() {
  // Revalidate on entering checkout (11.1): a fresh cart read, not the cached one.
  const cart = useCart({ revalidate: true })
  const blocked = cart.issueCount > 0 || cart.priceChangeCount > 0
  return (
    <AsyncView
      state={cart.state}
      loading={<ListSkeleton rows={3} label="Checking your cart" />}
    >
      {() => {
        if (!cart.revalidated)
          return <ListSkeleton rows={3} label="Checking your cart" />
        if (blocked)
          return (
            <BackToCart message="Your cart changed (stock or prices). Review it before checking out." />
          )
        // Empty is expected for a moment right after placing an order; any other time (typing
        // /checkout, Back from the confirmation) there is nothing to check out.
        if (cart.lines.length === 0 && !orderJustPlaced()) return <BackToCart />
        return (
          <CheckoutShell
            cart={{
              totals: cart.totals,
              lines: cart.lines.map((l) => ({
                productId: l.productId,
                name: l.name,
                qty: Math.min(l.qty, l.availableQty),
                unitPrice: l.unitPrice,
              })),
            }}
          />
        )
      }}
    </AsyncView>
  )
}

export function meta() {
  return noindexMeta("Checkout")
}

export const handle = { breadcrumb: "Checkout" } satisfies RouteHandle
