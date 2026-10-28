import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function ForgotPasswordRoute() {
  return <PlaceholderPage title="Forgot password" builtIn="10" />
}

export function meta() {
  return [{ title: pageTitle("Forgot password") }]
}

export const handle = { breadcrumb: "Forgot password" } satisfies RouteHandle
