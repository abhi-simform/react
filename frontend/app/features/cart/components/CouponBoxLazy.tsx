import { Suspense } from "react"

import { lazyNamed } from "@/lib/lazyNamed"

// react-hook-form lives behind this: the coupon form is only on the cart page and the checkout review.
const Inner = lazyNamed(() => import("./CouponBox"), "CouponBox")

export function CouponBox() {
  return (
    // Reserve the form's height so the page does not shift when it arrives.
    <Suspense fallback={<div className="min-h-24" aria-hidden />}>
      <Inner />
    </Suspense>
  )
}
