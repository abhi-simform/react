import { PolicyPage, POLICIES } from "@/features/policies"
import { RouteErrorView } from "@/components/common/RouteErrorView"
import { canonicalUrl, noindexMeta, pageMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

import type { Route } from "./+types/policy"

export default function PolicyRoute({ params }: Route.ComponentProps) {
  return <PolicyPage slug={params.slug} />
}

// Below the shell: an unknown slug shows the branded 404 between the header and the footer.
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteErrorView error={error} />
}

export function meta({ params }: Route.MetaArgs) {
  const policy = Object.hasOwn(POLICIES, params.slug)
    ? POLICIES[params.slug]
    : undefined
  if (!policy) return noindexMeta("Not found")
  return pageMeta({
    title: policy.title,
    description: policy.description,
    canonical: canonicalUrl(`/policies/${params.slug}`),
  })
}

export const handle = { breadcrumb: "Policy" } satisfies RouteHandle
