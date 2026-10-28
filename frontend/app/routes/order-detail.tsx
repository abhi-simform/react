import { PlaceholderPage } from "@/components/common/PlaceholderPage"

import type { Route } from "./+types/order-detail"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function OrderDetailRoute({ params }: Route.ComponentProps) {
  return (
    <PlaceholderPage
      title="Order detail"
      detail={`order id: ${params.orderId}`}
      builtIn="9 and 11"
    />
  )
}

export function meta() {
  return [{ title: pageTitle("Order details") }]
}

export const handle = { breadcrumb: "Order details" } satisfies RouteHandle
