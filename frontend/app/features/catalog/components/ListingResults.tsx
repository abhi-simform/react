import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { Button } from "@/components/ui/button"
import type { Paginated } from "@/lib/api/envelope"
import { assertNever } from "@/lib/assert"
import type { AsyncState } from "@/lib/asyncState"

import { PAGE_SIZE, type ListingFilters } from "../filters"
import type { Product, ProductListMeta } from "../types"
import { ProductCardSkeleton } from "./ProductCardSkeleton"
import { ProductGrid } from "./ProductGrid"

const gridClass = "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4"

type ListingResultsProps = {
  state: AsyncState<Paginated<Product, ProductListMeta>> & {
    reload: () => void
  }
  filters: ListingFilters
  activeCount: number
  onGoToPage: (page: number) => void
  onClearAll: () => void
}

/** The four request states of the listing: loading skeleton, error, empty, results. */
export function ListingResults({
  state,
  filters,
  activeCount,
  onGoToPage,
  onClearAll,
}: ListingResultsProps) {
  switch (state.status) {
    case "idle":
    case "loading":
      return (
        <ul
          className={gridClass}
          aria-busy="true"
          aria-label="Loading products"
        >
          {Array.from({ length: PAGE_SIZE }, (_, i) => (
            <li key={i}>
              <ProductCardSkeleton />
            </li>
          ))}
        </ul>
      )
    case "error":
      return <ErrorState error={state.error} onRetry={state.reload} />
    case "success":
      if (state.data.items.length > 0)
        return <ProductGrid products={state.data.items} view={filters.view} />
      return filters.page > 1 ? (
        <EmptyState title={`Page ${filters.page} does not exist`}>
          <Button variant="outline" onClick={() => onGoToPage(1)}>
            Go to page 1
          </Button>
        </EmptyState>
      ) : (
        <EmptyState title="No products match these filters">
          {activeCount > 0 && (
            <Button variant="outline" onClick={onClearAll}>
              Clear all filters
            </Button>
          )}
        </EmptyState>
      )
    default:
      return assertNever(state)
  }
}
