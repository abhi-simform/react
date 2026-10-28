import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { noindexMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

export default function OfflineRoute() {
  return <PlaceholderPage title="You are offline" builtIn="13" />
}

export function meta() {
  return noindexMeta("Offline")
}

export const handle = { breadcrumb: "Offline" } satisfies RouteHandle
