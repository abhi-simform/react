import { Suspense } from "react"

import { ListSkeleton } from "@/components/common/Skeletons"
import { lazyNamed } from "@/lib/lazyNamed"

// 13.3/13.6: the cart page (line rows with Motion's `m`, the coupon form with react-hook-form) is only
// needed on /cart. The feature's barrel exports THIS wrapper under the old name, so `import { CartPage }
// from "@/features/cart"` is unchanged but the heavy code is its own chunk, not part of every first load.
const Inner = lazyNamed(() => import("./CartPage"), "CartPage")

export function CartPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={3} />}>
      <Inner />
    </Suspense>
  )
}
