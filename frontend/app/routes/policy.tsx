import { PlaceholderPage } from "@/components/common/PlaceholderPage"

import type { Route } from "./+types/policy"
import { pageTitle } from "@/lib/pageTitle"
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

export function meta() {
  return [{ title: pageTitle("Policy") }]
}

export const handle = { breadcrumb: "Policy" } satisfies RouteHandle
