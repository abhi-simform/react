import { DeliveryStep, StepNav } from "@/features/checkout"
import { pageTitle } from "@/lib/pageTitle"
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
  return [{ title: pageTitle("Checkout: delivery") }]
}

export const handle = { breadcrumb: "Delivery" } satisfies RouteHandle
