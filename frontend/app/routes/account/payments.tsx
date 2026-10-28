import { PaymentsPage } from "@/features/payments"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function AccountPaymentsRoute() {
  return <PaymentsPage />
}

export function meta() {
  return [{ title: pageTitle("Payment history") }]
}

export const handle = { breadcrumb: "Payments" } satisfies RouteHandle
