import { ProductGrid } from "@/features/catalog"

import { useProductsByIds } from "../hooks/useProductsByIds"
import { useRecentlyViewed } from "../hooks/useRecentlyViewed"

const SHOWN = 6

export function RecentlyViewedRail() {
  const { ids } = useRecentlyViewed()
  const products = useProductsByIds(ids.slice(0, SHOWN))

  if (ids.length === 0) return null
  return (
    <section aria-labelledby="recently-viewed-title">
      <h2 id="recently-viewed-title" className="mb-2 font-medium">
        Recently viewed
      </h2>
      {products === null ? (
        <p>Loading...</p>
      ) : (
        <ProductGrid products={products} />
      )}
    </section>
  )
}
