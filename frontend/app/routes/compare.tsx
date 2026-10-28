import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function CompareRoute() {
  return <PlaceholderPage title="Compare products" builtIn="11" />
}

export function meta() {
  return [{ title: pageTitle("Compare products") }]
}

export const handle = { breadcrumb: "Compare" } satisfies RouteHandle
