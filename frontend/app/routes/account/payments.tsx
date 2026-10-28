import { PaymentsPage } from "@/features/payments"
import { noindexMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

export default function AccountPaymentsRoute() {
  return <PaymentsPage />
}

export function meta() {
  return noindexMeta("Payment history")
}

export const handle = { breadcrumb: "Payments" } satisfies RouteHandle
