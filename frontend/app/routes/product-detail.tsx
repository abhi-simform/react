import { ProductDetailPage } from "@/features/product"

import { RouteErrorView } from "@/components/common/RouteErrorView"

import type { Route } from "./+types/product-detail"

// Thin route: read the param, hand it to the feature.

export default function ProductDetailRoute({ params }: Route.ComponentProps) {
  return <ProductDetailPage slug={params.productSlug} />
}

// Below the shell: header and footer stay, only this slot shows the error.
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteErrorView error={error} />
}

// The title, description, canonical, Open Graph and JSON-LD come from the product itself: see ProductSeo
// (rendered by the page once the product is loaded). Returning no tags here avoids a second <title>.
export function meta() {
  return []
}
