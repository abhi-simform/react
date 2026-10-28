import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { useAuth } from "@/features/auth"
import type { Paginated } from "@/lib/api/envelope"
import { toApiError } from "@/lib/api/errors"
import { productKeys, reviewKeys } from "@/lib/queryKeys"

import { reviewQueries } from "../queries"
import {
  createReview,
  deleteReview,
  setHelpful,
  updateReview,
  type ReviewFilter,
  type ReviewPayload,
} from "../reviews.api"
import type { Review } from "../reviews.schemas"

type Pages = InfiniteData<Paginated<Review>, number>

const flatten = (data: Pages) => ({
  items: [
    ...new Map(
      data.pages.flatMap((p) => p.items).map((r) => [r.id, r])
    ).values(),
  ],
  total: data.pages.at(-1)!.meta.total,
})

/** Reviews as an infinite query for the CURRENT filter (the filter is part of the key). */
export function useReviews(productId: string, filter: ReviewFilter) {
  const q = useInfiniteQuery({
    ...reviewQueries.infinite(productId, filter),
    select: flatten,
  })
  return { query: q, items: q.data?.items ?? [], total: q.data?.total ?? 0 }
}

export const useReviewSummary = (productId: string) =>
  useQuery(reviewQueries.summary(productId))

/** Only meaningful when signed in (the endpoint needs a token), so it is `enabled` by auth. */
export function useReviewEligibility(productId: string) {
  const { status } = useAuth()
  return useQuery({
    ...reviewQueries.eligibility(productId),
    enabled: status === "authenticated",
  })
}

/**
 * After ANY change to a review, refresh exactly what it affects: this product's reviews (every
 * filter, the summary, my eligibility) and the product detail (its rating average and count),
 * not every list in the app.
 */
function useInvalidateReviews(productId: string, slug: string) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: reviewKeys.forProduct(productId),
      }),
      queryClient.invalidateQueries({ queryKey: productKeys.detail(slug) }),
    ])
}

export function useSaveReview(
  productId: string,
  slug: string,
  editingId?: string
) {
  const invalidate = useInvalidateReviews(productId, slug)
  return useMutation({
    meta: { silent: true },
    mutationFn: (payload: ReviewPayload) =>
      editingId
        ? updateReview(editingId, payload)
        : createReview(productId, payload),
    onSuccess: invalidate,
  })
}

export function useDeleteReview(productId: string, slug: string) {
  const invalidate = useInvalidateReviews(productId, slug)
  return useMutation({
    meta: { silent: true },
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: () => {
      toast.success("Your review was deleted")
      return invalidate()
    },
    onError: () => toast.error("We could not delete your review. Try again."),
  })
}

/**
 * "Helpful (n)" with an OPTIMISTIC update across every cached list of this product (the same review
 * can be on several filter combinations). The server vote is idempotent, the button is disabled
 * while the request runs (no double-vote from this tab) and the final count from the server
 * replaces the guess. Rolls back on error.
 */
export function useHelpfulVote(productId: string) {
  const queryClient = useQueryClient()
  const patchAll = (id: string, change: (r: Review) => Review) =>
    queryClient.setQueriesData<Pages>(
      { queryKey: reviewKeys.lists(productId) },
      (data) =>
        data && {
          ...data,
          pages: data.pages.map((p) => ({
            ...p,
            items: p.items.map((r) => (r.id === id ? change(r) : r)),
          })),
        }
    )
  return useMutation({
    meta: { silent: true },
    mutationFn: ({ id, on }: { id: string; on: boolean }) => setHelpful(id, on),
    onMutate: async ({ id, on }) => {
      await queryClient.cancelQueries({ queryKey: reviewKeys.lists(productId) })
      const snapshot = queryClient.getQueriesData<Pages>({
        queryKey: reviewKeys.lists(productId),
      })
      patchAll(id, (r) => ({
        ...r,
        myVote: on,
        helpfulCount: Math.max(
          0,
          r.helpfulCount + (on === r.myVote ? 0 : on ? 1 : -1)
        ),
      }))
      return { snapshot }
    },
    onError: (err, _vars, context) => {
      context?.snapshot.forEach(([key, data]) =>
        queryClient.setQueryData(key, data)
      )
      const e = toApiError(err)
      toast.error(
        e.code === "OWN_CONTENT"
          ? "You cannot vote on your own review."
          : "We could not save your vote. Please try again."
      )
    },
    onSuccess: (result, { id }) =>
      patchAll(id, (r) => ({
        ...r,
        helpfulCount: result.helpfulCount,
        myVote: result.myVote,
      })),
  })
}
