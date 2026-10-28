import { Loader2 } from "lucide-react"
import { useMemo, useState, useTransition } from "react"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { ProductGridSkeleton } from "@/components/common/Skeletons"
import { Button } from "@/components/ui/button"

import { PAGE_SIZE, type ListingFilters } from "../filters"
import type { useInfiniteProducts } from "../hooks/useInfiniteProducts"
import { LoadMoreSentinel } from "@/components/common/LoadMoreSentinel"
import { toProductCardVM } from "../mappers"
import { filterLoaded } from "../utils"
import { PerfProfiler } from "@/components/common/PerfProfiler"
import { ProductGrid } from "./ProductGrid"

type Props = {
  list: ReturnType<typeof useInfiniteProducts>
  filters: ListingFilters
  activeCount: number
  onClearAll: () => void
}

/** `view=more` mode: pages are appended; a failure on page N keeps pages 1..N-1 and offers a retry for N only. */
export function InfiniteResults({
  list,
  filters,
  activeCount,
  onClearAll,
}: Props) {
  // Two copies of the text, on purpose (13.2): `quick` is what the input shows and must update at once;
  // `applied` is what the 300+ cards are filtered by and may lag behind (a transition: interruptible, low priority).
  const [quick, setQuick] = useState("")
  const [applied, setApplied] = useState("")
  const [pending, startTransition] = useTransition()
  // Kept by hand: the cards are `memo`-ised on the IDENTITY of these view models, so they must be the same
  // objects render after render (see ProductCard). Measured in docs/perf-log.md.
  const cards = useMemo(() => list.items.map(toProductCardVM), [list.items])
  const shown = filterLoaded(cards, applied)
  if (list.status === "loading-first")
    return <ProductGridSkeleton count={PAGE_SIZE} view={filters.view} />
  if (list.status === "error-first" && list.error)
    return <ErrorState error={list.error} onRetry={list.retryFirst} />
  if (list.items.length === 0)
    return (
      <EmptyState
        title="No products match these filters"
        action={
          activeCount > 0 ? (
            <Button variant="outline" onClick={onClearAll}>
              Clear all filters
            </Button>
          ) : undefined
        }
      />
    )

  const loadingMore = list.status === "loading-more"
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm">
        <span>Filter loaded products</span>
        <input
          type="search"
          value={quick}
          onChange={(e) => {
            setQuick(e.target.value)
            startTransition(() => setApplied(e.target.value))
          }}
          placeholder={`Among the ${list.items.length} loaded`}
          className="w-64 rounded border p-1"
        />
      </label>
      <div
        aria-busy={pending}
        className={pending ? "opacity-60 transition-opacity" : undefined}
      >
        <PerfProfiler id="grid">
          <ProductGrid products={shown} view={filters.view} />
        </PerfProfiler>
      </div>
      <div
        className="mt-4 flex flex-col items-center gap-2"
        aria-busy={loadingMore}
      >
        {list.status === "error-more" && list.error && (
          <ErrorState error={list.error} onRetry={list.loadMore} />
        )}
        {list.hasNext ? (
          <>
            {/* The button is the keyboard/no-IntersectionObserver fallback and always works. */}
            <Button
              variant="outline"
              disabled={loadingMore}
              onClick={list.loadMore}
            >
              {loadingMore && <Loader2 aria-hidden className="animate-spin" />}
              {loadingMore ? "Loading..." : "Load more"}
            </Button>
            <LoadMoreSentinel
              enabled={list.status === "idle"}
              itemCount={list.items.length}
              onVisible={list.loadMore}
            />
          </>
        ) : (
          <p role="status" className="text-sm text-neutral-600">
            You&apos;ve seen it all ({list.total.toLocaleString("en-IN")}{" "}
            products)
          </p>
        )}
      </div>
    </div>
  )
}
