import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function CheckoutAddressRoute() {
  return <PlaceholderPage title="Delivery address" builtIn="7" />
}

export function meta() {
  return [{ title: pageTitle("Checkout: address") }]
}

export const handle = { breadcrumb: "Address" } satisfies RouteHandle
