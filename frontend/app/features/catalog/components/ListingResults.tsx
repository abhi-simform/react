import { AsyncView } from "@/components/common/AsyncView"
import { EmptyState } from "@/components/common/EmptyState"
import { ProductGridSkeleton } from "@/components/common/Skeletons"
import { Button } from "@/components/ui/button"
import type { Paginated } from "@/lib/api/envelope"
import type { AsyncState } from "@/lib/asyncState"

import { PAGE_SIZE, type ListingFilters } from "../filters"
import type { Product, ProductListMeta } from "../types"
import { toProductCardVM } from "../mappers"
import { ProductGrid } from "./ProductGrid"

type ListingResultsProps = {
  state: AsyncState<Paginated<Product, ProductListMeta>> & {
    reload: () => void
    isRefreshing?: boolean
  }
  filters: ListingFilters
  activeCount: number
  onGoToPage: (page: number) => void
  onClearAll: () => void
}

/** The states of the listing through the shared `AsyncView`. */
export function ListingResults({
  state,
  filters,
  activeCount,
  onGoToPage,
  onClearAll,
}: ListingResultsProps) {
  // `isRefreshing` + data = the previous page/filter is still shown while the next loads.
  const updating = state.status === "success" && state.isRefreshing
  return (
    <div className={updating ? "opacity-60 transition-opacity" : undefined}>
      {updating && (
        <div
          aria-hidden
          className="mb-2 h-0.5 w-full animate-pulse rounded bg-blue-500"
        />
      )}
      <AsyncView
        state={state}
        loading={<ProductGridSkeleton count={PAGE_SIZE} view={filters.view} />}
        empty={(data) => {
          if (data.items.length > 0) return null
          return filters.page > 1 ? (
            <EmptyState
              title={`Page ${filters.page} does not exist`}
              action={
                <Button variant="outline" onClick={() => onGoToPage(1)}>
                  Go to page 1
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No products match these filters"
              description={
                activeCount > 0
                  ? "Try removing a filter."
                  : "Nothing is listed here yet."
              }
              action={
                activeCount > 0 ? (
                  <Button variant="outline" onClick={onClearAll}>
                    Clear all filters
                  </Button>
                ) : undefined
              }
            />
          )
        }}
      >
        {(data) => (
          <ProductGrid
            products={data.items.map(toProductCardVM)}
            view={filters.view}
          />
        )}
      </AsyncView>
    </div>
  )
}
