import { ReviewStep, StepNav } from "@/features/checkout"
import { noindexMeta } from "@/lib/seo"
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
  return noindexMeta("Checkout: review")
}

export const handle = { breadcrumb: "Review" } satisfies RouteHandle
