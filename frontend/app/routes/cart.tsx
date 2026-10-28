import { CartPage } from "@/features/cart"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function CartRoute() {
  return <CartPage />
}

export function meta() {
  return [{ title: pageTitle("Cart") }]
}

export const handle = { breadcrumb: "Cart" } satisfies RouteHandle
