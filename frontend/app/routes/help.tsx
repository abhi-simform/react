import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function HelpRoute() {
  return <PlaceholderPage title="Help" builtIn="5" />
}

export function meta() {
  return [{ title: pageTitle("Help") }]
}

export const handle = { breadcrumb: "Help" } satisfies RouteHandle
