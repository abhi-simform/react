import { DealsPage } from "@/features/deals"
import { canonicalUrl, pageMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

export default function DealsRoute() {
  return <DealsPage />
}

export function meta() {
  return pageMeta({
    title: "Deals",
    description:
      "Live flash sales and deals on ShopSphere: limited-time prices with countdowns.",
    canonical: canonicalUrl("/deals"),
  })
}

export const handle = { breadcrumb: "Deals" } satisfies RouteHandle
