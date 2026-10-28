import { ReviewStep, StepNav } from "@/features/checkout"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function CheckoutReviewRoute() {
  return (
    <>
      <ReviewStep />
      <StepNav />
    </>
  )
}

export function meta() {
  return [{ title: pageTitle("Checkout: review") }]
}

export const handle = { breadcrumb: "Review" } satisfies RouteHandle
