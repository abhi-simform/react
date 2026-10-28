import { OrdersPage } from "@/features/orders"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function OrdersRoute() {
  return <OrdersPage />
}

export function meta() {
  return [{ title: pageTitle("Your orders") }]
}

export const handle = { breadcrumb: "Orders" } satisfies RouteHandle
