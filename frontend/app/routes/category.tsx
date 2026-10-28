import { PlaceholderPage } from "@/components/common/PlaceholderPage"

import type { Route } from "./+types/category"

export default function CategoryRoute({ params }: Route.ComponentProps) {
  return (
    <PlaceholderPage title="Category" detail={`slug: ${params.categorySlug}`} />
  )
}
