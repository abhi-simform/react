import { CartPage } from "@/features/cart"
import { noindexMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

export default function CartRoute() {
  return <CartPage />
}

export function meta() {
  return noindexMeta("Cart")
}

export const handle = { breadcrumb: "Cart" } satisfies RouteHandle
