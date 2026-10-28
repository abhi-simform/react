import { DealsPage } from "@/features/deals"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function DealsRoute() {
  return <DealsPage />
}

export function meta() {
  return [{ title: pageTitle("Deals") }]
}

export const handle = { breadcrumb: "Deals" } satisfies RouteHandle
