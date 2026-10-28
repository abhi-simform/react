import { NotificationsPage } from "@/features/notifications"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function AccountNotificationsRoute() {
  return <NotificationsPage />
}

export function meta() {
  return [{ title: pageTitle("Notifications") }]
}

export const handle = { breadcrumb: "Notifications" } satisfies RouteHandle
