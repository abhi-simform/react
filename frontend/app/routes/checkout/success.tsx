import { PlaceholderPage } from "@/components/common/PlaceholderPage"

import type { Route } from "./+types/success"

export default function CheckoutSuccessRoute({ params }: Route.ComponentProps) {
  return (
    <PlaceholderPage
      title="Order placed"
      detail={`order id: ${params.orderId}`}
      builtIn="11"
    />
  )
}
