import { OrderSuccessPage } from "@/features/orders"

import type { Route } from "./+types/success"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function CheckoutSuccessRoute({ params }: Route.ComponentProps) {
  return <OrderSuccessPage orderId={params.orderId} />
}

export function meta() {
  return [{ title: pageTitle("Order placed") }]
}

export const handle = { breadcrumb: "Order placed" } satisfies RouteHandle
