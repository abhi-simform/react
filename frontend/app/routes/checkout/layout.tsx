import { CheckoutShell } from "@/features/checkout"
import { pageTitle } from "@/lib/pageTitle"
import { cartLinesFixture } from "@/test/fixtures/cartLines"
import type { RouteHandle } from "@/types/route-handle"

export default function CheckoutLayout() {
  // Fixture lines until the cart API (Stage 9): passed in, so the feature never imports fixtures.
  return <CheckoutShell lines={cartLinesFixture} />
}

export function meta() {
  return [{ title: pageTitle("Checkout") }]
}

export const handle = { breadcrumb: "Checkout" } satisfies RouteHandle
