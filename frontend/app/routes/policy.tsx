import { PlaceholderPage } from "@/components/common/PlaceholderPage"

import type { Route } from "./+types/policy"

export default function PolicyRoute({ params }: Route.ComponentProps) {
  return (
    <PlaceholderPage
      title="Policy"
      detail={`slug: ${params.slug}`}
      builtIn="5"
    />
  )
}
