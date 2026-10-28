import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function WishlistRoute() {
  return <PlaceholderPage title="Wishlist" builtIn="9" />
}

export function meta() {
  return [{ title: pageTitle("Wishlist") }]
}

export const handle = { breadcrumb: "Wishlist" } satisfies RouteHandle
