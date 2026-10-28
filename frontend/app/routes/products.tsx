import { useState } from "react"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { Button } from "@/components/ui/button"
import { ProductCardSkeleton } from "@/features/catalog/components/ProductCardSkeleton"
import { ProductGrid } from "@/features/catalog/components/ProductGrid"
import { useProducts } from "@/features/catalog/hooks/useProducts"
import { assertNever } from "@/lib/assert"

const LIMIT = 12
const gridClass =
  "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"

export default function ProductsRoute() {
  // Page lives in useState for now; Stage 5 moves it into the URL.
  const [page, setPage] = useState(1)
  const state = useProducts({ page, limit: LIMIT })

  function body() {
    switch (state.status) {
      case "idle":
      case "loading":
        return (
          <ul
            className={gridClass}
            aria-busy="true"
            aria-label="Loading products"
          >
            {Array.from({ length: LIMIT }, (_, i) => (
              <li key={i}>
                <ProductCardSkeleton />
              </li>
            ))}
          </ul>
        )
      case "error":
        return <ErrorState error={state.error} onRetry={state.reload} />
      case "success":
        return state.data.items.length === 0 ? (
          <EmptyState title="No products found" />
        ) : (
          <ProductGrid products={state.data.items} />
        )
      default:
        return assertNever(state)
    }
  }

  const meta = state.status === "success" ? state.data.meta : undefined

  return (
    <div className="p-4">
      <h1 className="mb-3 text-xl font-medium">Products</h1>
      {body()}
      <nav aria-label="Pagination" className="mt-4 flex items-center gap-3">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </Button>
        <span aria-live="polite">
          {meta ? `Page ${meta.page} of ${meta.totalPages}` : `Page ${page}`}
        </span>
        <Button
          variant="outline"
          disabled={!meta?.hasNext}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </nav>
    </div>
  )
}
