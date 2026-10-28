import { ProductListingPage } from "@/features/catalog/components/ProductListingPage"

import type { Route } from "./+types/category"

// Same page as /products with a preset category from the path.
export default function CategoryRoute({ params }: Route.ComponentProps) {
  return <ProductListingPage categorySlug={params.categorySlug} />
}
