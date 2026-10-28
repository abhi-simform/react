import { NotificationsPage } from "@/features/notifications"
import { noindexMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

export default function AccountNotificationsRoute() {
  return <NotificationsPage />
}

export function meta() {
  return noindexMeta("Notifications")
}

export const handle = { breadcrumb: "Notifications" } satisfies RouteHandle
