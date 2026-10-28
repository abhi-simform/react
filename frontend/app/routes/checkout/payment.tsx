import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function CheckoutPaymentRoute() {
  return <PlaceholderPage title="Payment" builtIn="11" />
}

export function meta() {
  return [{ title: pageTitle("Checkout: payment") }]
}

export const handle = { breadcrumb: "Payment" } satisfies RouteHandle
