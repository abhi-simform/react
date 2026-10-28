import { PlaceOrderButton } from "@/features/checkout"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function CheckoutReviewRoute() {
  return (
    <div>
      <h1 className="text-xl font-medium">Review order</h1>
      <p className="my-2 text-sm text-neutral-600">
        Placeholder: the real review step arrives in Stage 11.
      </p>
      <PlaceOrderButton />
    </div>
  )
}

export function meta() {
  return [{ title: pageTitle("Checkout: review") }]
}

export const handle = { breadcrumb: "Review" } satisfies RouteHandle
