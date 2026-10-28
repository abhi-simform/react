import { OfflinePage } from "@/features/offline"
import { noindexMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

export default function OfflineRoute() {
  return <OfflinePage />
}

export function meta() {
  return noindexMeta("Offline")
}

export const handle = { breadcrumb: "Offline" } satisfies RouteHandle
