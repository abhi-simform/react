import { SecurityPage } from "@/features/account"
import { noindexMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

export default function AccountSecurityRoute() {
  return <SecurityPage />
}

export function meta() {
  return noindexMeta("Security")
}

export const handle = { breadcrumb: "Security" } satisfies RouteHandle
