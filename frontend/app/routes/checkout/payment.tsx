import { PaymentStep, StepNav } from "@/features/checkout"
import { noindexMeta } from "@/lib/seo"
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
  return noindexMeta("Checkout: payment")
}

export const handle = { breadcrumb: "Payment" } satisfies RouteHandle
