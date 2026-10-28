import { PlaceholderPage } from "@/components/common/PlaceholderPage"

import type { Route } from "./+types/success"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function CheckoutSuccessRoute({ params }: Route.ComponentProps) {
  return (
    <PlaceholderPage
      title="Order placed"
      detail={`order id: ${params.orderId}`}
      builtIn="11"
    />
  )
}

export function meta() {
  return [{ title: pageTitle("Order placed") }]
}

export const handle = { breadcrumb: "Order placed" } satisfies RouteHandle
