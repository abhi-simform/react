import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { canonicalUrl, pageMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

export default function HelpRoute() {
  return <PlaceholderPage title="Help" builtIn="5" />
}

export function meta() {
  return pageMeta({
    title: "Help",
    description:
      "Help and support for ShopSphere orders, payments, returns and your account.",
    canonical: canonicalUrl("/help"),
  })
}

export const handle = { breadcrumb: "Help" } satisfies RouteHandle
