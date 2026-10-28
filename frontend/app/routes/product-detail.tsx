import { ProductDetailPage } from "@/features/product/components/ProductDetailPage"

import { RouteErrorView } from "@/components/common/RouteErrorView"

import type { Route } from "./+types/product-detail"

// Thin route: read the param, hand it to the feature.
import { pageTitle } from "@/lib/pageTitle"

export default function ProductDetailRoute({ params }: Route.ComponentProps) {
  return <ProductDetailPage slug={params.productSlug} />
}

// Below the shell: header and footer stay, only this slot shows the error.
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteErrorView error={error} />
}

export function meta() {
  return [{ title: pageTitle("Product") }]
}
