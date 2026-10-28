import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function OfflineRoute() {
  return <PlaceholderPage title="You are offline" builtIn="13" />
}

export function meta() {
  return [{ title: pageTitle("Offline") }]
}

export const handle = { breadcrumb: "Offline" } satisfies RouteHandle
