import { ProductDetailPage } from "@/features/product/components/ProductDetailPage"

import type { Route } from "./+types/product-detail"

// Thin route: read the param, hand it to the feature.
export default function ProductDetailRoute({ params }: Route.ComponentProps) {
  return <ProductDetailPage slug={params.productSlug} />
}
