import { ProductListingPage } from "@/features/catalog/components/ProductListingPage"

// Thin route: all state lives in the URL, all logic in the feature.
export default function ProductsRoute() {
  return <ProductListingPage />
}
