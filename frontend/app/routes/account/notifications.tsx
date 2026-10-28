import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function AccountNotificationsRoute() {
  return <PlaceholderPage title="Notifications" builtIn="11" />
}

export function meta() {
  return [{ title: pageTitle("Notifications") }]
}

export const handle = { breadcrumb: "Notifications" } satisfies RouteHandle
