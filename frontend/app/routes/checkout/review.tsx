import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { paths } from "@/lib/paths"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function CheckoutReviewRoute() {
  const navigate = useNavigate()
  return (
    <div>
      <h1 className="text-xl font-medium">Review order</h1>
      <p className="my-2 text-sm text-neutral-600">
        Placeholder: the real review step arrives in Stage 11.
      </p>
      <Button
        onClick={() => {
          // Fake order. `replace` swaps this entry for the success page, so Back
          // does not land on a payment form for an order that already exists.
          navigate(paths.orderSuccess(`fake-${Date.now()}`), { replace: true })
        }}
      >
        Place order (fake)
      </Button>
    </div>
  )
}

export function meta() {
  return [{ title: pageTitle("Checkout: review") }]
}

export const handle = { breadcrumb: "Review" } satisfies RouteHandle
