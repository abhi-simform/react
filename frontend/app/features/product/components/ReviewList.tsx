import { Loader2 } from "lucide-react"

import { ErrorState } from "@/components/common/ErrorState"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { LoadMoreSentinel } from "@/components/common/LoadMoreSentinel"
import { toApiError } from "@/lib/api/errors"

import type { useReviews } from "../hooks/useReviews"

/**
 * Reviews, "load more" (9.8). Pages accumulate; the sentinel and the button both call
 * `fetchNextPage`. An error on page N keeps pages 1..N-1 on screen with an inline retry for
 * N only (`isFetchNextPageError`); an error on the first page is a section-level error.
 */
export function ReviewList({
  reviews,
}: {
  reviews: ReturnType<typeof useReviews>
}) {
  const { query: q, items, total } = reviews
  if (q.isPending && q.fetchStatus === "idle")
    return <p className="text-sm">Waiting for the product...</p>
  if (q.isPending)
    return (
      <div aria-busy="true" className="flex flex-col gap-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  if (q.isError && !q.data)
    return (
      <ErrorState
        error={toApiError(q.error)}
        onRetry={() => void q.refetch()}
      />
    )
  return (
    <div>
      <p className="mb-2 text-xs text-neutral-600">{total} reviews</p>
      <ul className="flex flex-col gap-3">
        {items.map((r) => (
          <li key={r.id} className="border-b pb-2">
            <p className="font-medium">
              {"★".repeat(r.rating)}
              <span className="sr-only">{r.rating} out of 5</span> {r.title}
            </p>
            <p>{r.body}</p>
            <p className="text-xs text-neutral-500">
              {r.author}
              {r.verifiedPurchase ? ", verified purchase" : ""}
            </p>
          </li>
        ))}
      </ul>
      <div
        className="mt-3 flex flex-col items-center gap-2"
        aria-busy={q.isFetchingNextPage}
      >
        {q.isFetchNextPageError && (
          <ErrorState
            error={toApiError(q.error)}
            onRetry={() => void q.fetchNextPage()}
          />
        )}
        {q.hasNextPage ? (
          <>
            <Button
              variant="outline"
              disabled={q.isFetchingNextPage}
              onClick={() => void q.fetchNextPage()}
            >
              {q.isFetchingNextPage && (
                <Loader2 aria-hidden className="animate-spin" />
              )}
              {q.isFetchingNextPage ? "Loading..." : "Load more reviews"}
            </Button>
            <LoadMoreSentinel
              enabled={!q.isFetchingNextPage && !q.isFetchNextPageError}
              itemCount={items.length}
              onVisible={() => void q.fetchNextPage()}
            />
          </>
        ) : (
          <p role="status" className="text-xs text-neutral-600">
            That is every review.
          </p>
        )}
      </div>
    </div>
  )
}
