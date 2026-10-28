import { OrderDetailPage } from "@/features/orders"

import type { Route } from "./+types/order-detail"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function OrderDetailRoute({ params }: Route.ComponentProps) {
  return <OrderDetailPage orderId={params.orderId} />
}

export function meta() {
  return [{ title: pageTitle("Order details") }]
}

export const handle = { breadcrumb: "Order details" } satisfies RouteHandle
