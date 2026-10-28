import { PaymentStep, StepNav } from "@/features/checkout"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function CheckoutPaymentRoute() {
  return (
    <>
      <PaymentStep />
      <StepNav />
    </>
  )
}

export function meta() {
  return [{ title: pageTitle("Checkout: payment") }]
}

export const handle = { breadcrumb: "Payment" } satisfies RouteHandle
