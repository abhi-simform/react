import { CheckoutShell } from "@/features/checkout"
import { useCart } from "@/features/cart"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function CheckoutLayout() {
  // The real (server) cart: passed in, so the checkout feature never reads the cart itself.
  const { totalsLines } = useCart()
  return <CheckoutShell lines={totalsLines} />
}

export function meta() {
  return [{ title: pageTitle("Checkout") }]
}

export const handle = { breadcrumb: "Checkout" } satisfies RouteHandle
