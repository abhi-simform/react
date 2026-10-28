import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function RegisterRoute() {
  return <PlaceholderPage title="Create account" builtIn="7 and 10" />
}

export function meta() {
  return [{ title: pageTitle("Create account") }]
}

export const handle = { breadcrumb: "Create account" } satisfies RouteHandle
