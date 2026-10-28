import { SecurityPage } from "@/features/account"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function AccountSecurityRoute() {
  return <SecurityPage />
}

export function meta() {
  return [{ title: pageTitle("Security") }]
}

export const handle = { breadcrumb: "Security" } satisfies RouteHandle
