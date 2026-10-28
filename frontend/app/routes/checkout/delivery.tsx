import { DeliveryStep, StepNav } from "@/features/checkout"
import { noindexMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

export default function CheckoutDeliveryRoute() {
  return (
    <>
      <DeliveryStep />
      <StepNav />
    </>
  )
}

export function meta() {
  return noindexMeta("Checkout: delivery")
}

export const handle = { breadcrumb: "Delivery" } satisfies RouteHandle
