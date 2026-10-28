import { PlaceholderPage } from "@/components/common/PlaceholderPage"

import type { Route } from "./+types/order-detail"

export default function OrderDetailRoute({ params }: Route.ComponentProps) {
  return (
    <PlaceholderPage
      title="Order detail"
      detail={`order id: ${params.orderId}`}
      builtIn="9 and 11"
    />
  )
}
