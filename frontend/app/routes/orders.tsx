import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function OrdersRoute() {
  return <PlaceholderPage title="Your orders" builtIn="9" />
}

export function meta() {
  return [{ title: pageTitle("Your orders") }]
}

export const handle = { breadcrumb: "Orders" } satisfies RouteHandle
