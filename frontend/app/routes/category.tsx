import { ProductListingPage } from "@/features/catalog"

import { RouteErrorView } from "@/components/common/RouteErrorView"

import type { Route } from "./+types/category"

// Same page as /products with a preset category from the path.
import { pageTitle } from "@/lib/pageTitle"

export default function CategoryRoute({ params }: Route.ComponentProps) {
  return <ProductListingPage categorySlug={params.categorySlug} />
}

// Below the shell: header and footer stay, only this slot shows the error.
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteErrorView error={error} />
}

export function meta() {
  return [{ title: pageTitle("Category") }]
}
