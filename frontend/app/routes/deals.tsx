import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function DealsRoute() {
  return <PlaceholderPage title="Deals and flash sales" builtIn="11" />
}

export function meta() {
  return [{ title: pageTitle("Deals") }]
}

export const handle = { breadcrumb: "Deals" } satisfies RouteHandle
