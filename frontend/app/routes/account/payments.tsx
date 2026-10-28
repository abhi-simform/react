import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function AccountPaymentsRoute() {
  return <PlaceholderPage title="Payment history" builtIn="11" />
}

export function meta() {
  return [{ title: pageTitle("Payment history") }]
}

export const handle = { breadcrumb: "Payments" } satisfies RouteHandle
