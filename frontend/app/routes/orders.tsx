import { OrdersPage } from "@/features/orders"
import { noindexMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

export default function OrdersRoute() {
  return <OrdersPage />
}

export function meta() {
  return noindexMeta("Your orders")
}

export const handle = { breadcrumb: "Orders" } satisfies RouteHandle
