import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query"

import type { Paginated } from "@/lib/api/envelope"
import { productKeys, reviewKeys } from "@/lib/queryKeys"

import { questionQueries, reviewQueries } from "../queries"
import { addReview, type ReviewItem } from "../reviews.api"

type Pages = InfiniteData<Paginated<ReviewItem>, number>
const flatten = (data: Pages) => ({
  items: [
    ...new Map(
      data.pages.flatMap((p) => p.items).map((r) => [r.id, r])
    ).values(),
  ],
  total: data.pages.at(-1)!.meta.total,
})

/**
 * Reviews as an infinite query (9.8). DEPENDENT (9.9): `enabled` waits for the real product
 * (the page passes `false` while only list data is on screen). While `enabled` is false the query
 * is `status: "pending"` with `fetchStatus: "idle"`: it has no data AND is doing nothing.
 */
export function useReviews(
  productId: string,
  enabled: boolean,
  failPage?: number
) {
  const q = useInfiniteQuery({
    ...reviewQueries.infinite(productId, failPage),
    enabled,
    select: flatten,
  })
  return {
    query: q,
    items: q.data?.items ?? [],
    total: q.data?.total ?? 0,
  }
}

export const useQuestions = (
  productId: string,
  enabled: boolean,
  fail = false
) => useQuery({ ...questionQueries.list(productId, fail), enabled })

/**
 * Add a review (9.4): no optimistic write, the new review is not "ours" until the server has it.
 * On success invalidate exactly what changed: THIS product's reviews (all pages) and the product
 * detail (its rating average/count), not every list in the app.
 */
export function useAddReview(productId: string, slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { rating: number; text: string }) =>
      addReview(productId, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: reviewKeys.forProduct(productId),
        }),
        queryClient.invalidateQueries({ queryKey: productKeys.detail(slug) }),
      ]),
  })
}
