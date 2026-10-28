import { Loader2 } from "lucide-react"
import { Suspense, useEffect, useRef, useState } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router"

import { ErrorState } from "@/components/common/ErrorState"
import { LoadMoreSentinel } from "@/components/common/LoadMoreSentinel"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Rating } from "@/components/common/Rating"
import { useAuth } from "@/features/auth"
import { toApiError } from "@/lib/api/errors"
import { paths } from "@/lib/paths"

import {
  useDeleteReview,
  useHelpfulVote,
  useReviewEligibility,
  useReviews,
  useReviewSummary,
} from "../hooks/useReviews"
import {
  parseReviewFilter,
  SORT_LABELS,
  withReviewFilter,
} from "../reviewFilters"
import { rememberHelpfulIntent, takeHelpfulIntent } from "../reviewIntent"
import type { ReviewFilter, ReviewSort } from "../reviews.api"
import type { Review } from "../reviews.schemas"
import { RatingHistogram } from "./RatingHistogram"
import { ReviewCard } from "./ReviewCard"
import { lazyNamed } from "@/lib/lazyNamed"

// 13.3: the review editor (react-hook-form, zod resolver, photo upload) loads when someone starts writing.
const loadReviewDialog = () => import("./ReviewDialog")
const ReviewDialog = lazyNamed(loadReviewDialog, "ReviewDialog")

/**
 * The reviews tab (11.6): API-driven summary + histogram (click a bar to filter), sort, photo
 * filter, infinite list, helpful votes, write / edit / delete. Filters live in the URL.
 * Layout shift: the summary and the list have skeletons with the same height as the content.
 */
export function ReviewsSection({
  product,
}: {
  product: { id: string; slug: string }
}) {
  const [params, setParams] = useSearchParams()
  const filter = parseReviewFilter(params)
  const setFilter = (next: Partial<ReviewFilter>) =>
    setParams((cur) => withReviewFilter(cur, next), {
      replace: true,
      preventScrollReset: true,
    })

  const { status: authStatus } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const summary = useReviewSummary(product.id)
  const { query: q, items, total } = useReviews(product.id, filter)
  const eligibility = useReviewEligibility(product.id)
  const helpful = useHelpfulVote(product.id)
  const del = useDeleteReview(product.id, product.slug)
  const [dialog, setDialog] = useState<{ open: boolean; existing?: Review }>({
    open: false,
  })
  // Mount the (lazy) editor from the first time it is opened, and keep it mounted so it can animate out.
  const [dialogWanted, setDialogWanted] = useState(false)
  if (dialog.open && !dialogWanted) setDialogWanted(true)

  const toLogin = () =>
    void navigate(paths.login(location.pathname + location.search))

  function onHelpful(r: Review) {
    if (authStatus !== "authenticated") {
      rememberHelpfulIntent(product.id, r.id) // cast after login
      toLogin()
      return
    }
    helpful.mutate({ id: r.id, on: !r.myVote })
  }

  // Apply the vote the shopper wanted before logging in, exactly once.
  const applied = useRef(false)
  const { mutate: vote } = helpful
  useEffect(() => {
    if (authStatus !== "authenticated" || applied.current) return
    applied.current = true
    const id = takeHelpfulIntent(product.id)
    if (id) vote({ id, on: true })
  }, [authStatus, product.id, vote])

  const filtered = filter.rating !== undefined || filter.photos
  return (
    <div className="text-sm">
      <div className="my-3 grid min-h-[9.5rem] gap-4 sm:grid-cols-[10rem_1fr]">
        {summary.data ? (
          <>
            <div>
              <p className="text-3xl font-medium" data-testid="avg">
                {summary.data.count
                  ? summary.data.average.toFixed(1)
                  : "No ratings"}
              </p>
              {summary.data.count > 0 && (
                <Rating value={summary.data.average} />
              )}
              <p className="text-xs text-neutral-600" data-testid="count">
                {summary.data.count} review{summary.data.count === 1 ? "" : "s"}
              </p>
            </div>
            <RatingHistogram
              summary={summary.data}
              active={filter.rating}
              onSelect={(star) => setFilter({ rating: star })}
            />
          </>
        ) : summary.isError ? (
          <ErrorState
            error={toApiError(summary.error)}
            onRetry={() => void summary.refetch()}
          />
        ) : (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        )}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1">
          Sort
          <select
            className="rounded border p-1"
            value={filter.sort}
            onChange={(e) => setFilter({ sort: e.target.value as ReviewSort })}
          >
            {Object.entries(SORT_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={filter.photos}
            onChange={(e) => setFilter({ photos: e.target.checked })}
          />
          With photos{summary.data ? ` (${summary.data.withPhotos})` : ""}
        </label>
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilter({ rating: undefined, photos: false })}
          >
            Clear filters
          </Button>
        )}
      </div>

      <WriteReview
        authStatus={authStatus}
        eligibility={eligibility.data}
        onLogin={toLogin}
        onWrite={() => setDialog({ open: true })}
        onEditMine={(r) => setDialog({ open: true, existing: r })}
      />

      <div className="min-h-40">
        {q.isPending ? (
          <div aria-busy="true" className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : q.isError && !q.data ? (
          <ErrorState
            error={toApiError(q.error)}
            onRetry={() => void q.refetch()}
          />
        ) : items.length === 0 ? (
          <p role="status" className="py-4 text-neutral-600">
            {filtered
              ? "No reviews match these filters."
              : "No reviews yet. Be the first to write one."}
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs text-neutral-600">
              {total} review{total === 1 ? "" : "s"}
              {filtered ? " match" : ""}
            </p>
            <ul className="flex flex-col gap-3">
              {items.map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  helpfulBusy={
                    helpful.isPending && helpful.variables?.id === r.id
                  }
                  onHelpful={onHelpful}
                  onEdit={(rev) => setDialog({ open: true, existing: rev })}
                  onDelete={(rev) => {
                    if (window.confirm("Delete your review?"))
                      del.mutate(rev.id)
                  }}
                />
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
          </>
        )}
      </div>

      {dialogWanted && (
        <Suspense fallback={null}>
          <ReviewDialog
            productId={product.id}
            slug={product.slug}
            existing={dialog.existing}
            open={dialog.open}
            onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
          />
        </Suspense>
      )}
    </div>
  )
}

function WriteReview({
  authStatus,
  eligibility,
  onLogin,
  onWrite,
  onEditMine,
}: {
  authStatus: string
  eligibility?: {
    canReview: boolean
    reason: string | null
    verifiedPurchase: boolean
    review: Review | null
  }
  onLogin: () => void
  onWrite: () => void
  onEditMine: (r: Review) => void
}) {
  if (authStatus !== "authenticated")
    return (
      <div className="mb-3 flex items-center gap-2">
        <Button
          variant="outline"
          onClick={onLogin}
          disabled={authStatus === "loading"}
        >
          Log in to write a review
        </Button>
      </div>
    )
  if (!eligibility) return <div className="mb-3 h-8" aria-hidden />
  if (eligibility.canReview)
    return (
      <div className="mb-3 flex items-center gap-2">
        <Button variant="outline" onClick={onWrite}>
          Write a review
        </Button>
        {eligibility.verifiedPurchase && (
          <span className="text-xs text-neutral-600">
            Your review will show "Verified purchase".
          </span>
        )}
      </div>
    )
  return (
    <p className="mb-3 text-xs text-neutral-700" data-testid="no-review-reason">
      {eligibility.reason === "ALREADY_REVIEWED" ? (
        <>
          You have already reviewed this product.{" "}
          {eligibility.review && (
            <Button
              variant="link"
              size="xs"
              onClick={() => onEditMine(eligibility.review!)}
            >
              Edit your review
            </Button>
          )}
        </>
      ) : (
        "You cannot review a product you sell."
      )}
    </p>
  )
}
