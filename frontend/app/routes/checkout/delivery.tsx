import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function CheckoutDeliveryRoute() {
  return <PlaceholderPage title="Delivery options" builtIn="11" />
}

export function meta() {
  return [{ title: pageTitle("Checkout: delivery") }]
}

export const handle = { breadcrumb: "Delivery" } satisfies RouteHandle
