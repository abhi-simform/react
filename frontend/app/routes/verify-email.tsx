import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function VerifyEmailRoute() {
  return <PlaceholderPage title="Verify your email" builtIn="10" />
}

export function meta() {
  return [{ title: pageTitle("Verify your email") }]
}

export const handle = { breadcrumb: "Verify email" } satisfies RouteHandle
