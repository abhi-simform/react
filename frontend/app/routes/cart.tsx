import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { CouponBox } from "@/features/cart"
import { pageTitle } from "@/lib/pageTitle"
import { cartLinesFixture } from "@/test/fixtures/cartLines"
import type { RouteHandle } from "@/types/route-handle"

export default function CartRoute() {
  return (
    <>
      <PlaceholderPage title="Your cart" builtIn="8 and 9" />
      <section aria-label="Coupon" className="max-w-sm p-4">
        <p className="mb-2 text-xs text-neutral-500">
          Fixture cart (Rs 1,497 subtotal). Try SAVE10, FLAT100, OLD50, anything
          else.
        </p>
        <CouponBox lines={cartLinesFixture} />
      </section>
    </>
  )
}

export function meta() {
  return [{ title: pageTitle("Cart") }]
}

export const handle = { breadcrumb: "Cart" } satisfies RouteHandle
