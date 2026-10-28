import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function CartRoute() {
  return <PlaceholderPage title="Your cart" builtIn="8 and 9" />
}

export function meta() {
  return [{ title: pageTitle("Cart") }]
}

export const handle = { breadcrumb: "Cart" } satisfies RouteHandle
