import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function ResetPasswordRoute() {
  return <PlaceholderPage title="Reset password" builtIn="10" />
}

export function meta() {
  return [{ title: pageTitle("Reset password") }]
}

export const handle = { breadcrumb: "Reset password" } satisfies RouteHandle
