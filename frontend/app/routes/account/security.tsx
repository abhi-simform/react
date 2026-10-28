import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function AccountSecurityRoute() {
  return <PlaceholderPage title="Security" builtIn="10" />
}

export function meta() {
  return [{ title: pageTitle("Security") }]
}

export const handle = { breadcrumb: "Security" } satisfies RouteHandle
