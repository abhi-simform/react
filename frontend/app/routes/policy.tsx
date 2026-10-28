import { PlaceholderPage } from "@/components/common/PlaceholderPage"

import type { Route } from "./+types/policy"
import { canonicalUrl, pageMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

export default function PolicyRoute({ params }: Route.ComponentProps) {
  return (
    <PlaceholderPage
      title="Policy"
      detail={`slug: ${params.slug}`}
      builtIn="5"
    />
  )
}

export function meta({ params }: Route.MetaArgs) {
  const name = params.slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
  return pageMeta({
    title: `${name} policy`,
    description: `ShopSphere ${name.toLowerCase()} policy.`,
    canonical: canonicalUrl(`/policies/${params.slug}`),
  })
}

export const handle = { breadcrumb: "Policy" } satisfies RouteHandle
