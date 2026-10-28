import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function SellerRoute() {
  return <PlaceholderPage title="Seller area" builtIn="Admin track" />
}

export function meta() {
  return [{ title: pageTitle("Seller area") }]
}

export const handle = { breadcrumb: "Seller area" } satisfies RouteHandle
