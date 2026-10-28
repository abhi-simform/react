import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"

import { getProducts } from "@/features/catalog"
import { STALE } from "@/lib/query-client"
import {
  offerKeys,
  questionKeys,
  relatedKeys,
  reviewKeys,
} from "@/lib/queryKeys"

import { getOffers } from "./offers.api"
import {
  getAnswers,
  getEligibility,
  getQuestions,
  getReviews,
  getReviewSummary,
  type ReviewFilter,
} from "./reviews.api"

/** Related products: same category, best rated, minus the product itself. */
export const relatedQueries = {
  list: (categorySlug: string, excludeSlug: string) =>
    queryOptions({
      queryKey: relatedKeys.list(categorySlug, excludeSlug),
      queryFn: async ({ signal }) => {
        const page = await getProducts(
          { category: categorySlug, limit: 6, sort: "rating" },
          signal
        )
        return page.items.filter((p) => p.slug !== excludeSlug).slice(0, 5)
      },
      staleTime: STALE.catalog,
    }),
}

/**
 * Reviews (B7): "load more" lists keyed by product AND filter (so each star/sort/photo combination
 * has its own cache entry and Back to a filter is instant), a summary (histogram) and the
 * shopper's eligibility to write one.
 */
export const reviewQueries = {
  infinite: (productId: string, filter: ReviewFilter) =>
    infiniteQueryOptions({
      queryKey: reviewKeys.list(productId, filter),
      initialPageParam: 1,
      queryFn: ({ pageParam, signal }) =>
        getReviews(productId, filter, pageParam, signal),
      getNextPageParam: (last) =>
        last.meta.hasNext ? last.meta.page + 1 : undefined,
      staleTime: STALE.catalog,
    }),
  summary: (productId: string) =>
    queryOptions({
      queryKey: reviewKeys.summary(productId),
      queryFn: ({ signal }) => getReviewSummary(productId, signal),
      staleTime: STALE.catalog,
    }),
  eligibility: (productId: string) =>
    queryOptions({
      queryKey: reviewKeys.eligibility(productId),
      queryFn: ({ signal }) => getEligibility(productId, signal),
      staleTime: STALE.personal,
    }),
}

export const questionQueries = {
  infinite: (productId: string, sort: "helpful" | "newest") =>
    infiniteQueryOptions({
      queryKey: questionKeys.list(productId, { sort }),
      initialPageParam: 1,
      queryFn: ({ pageParam, signal }) =>
        getQuestions(productId, sort, pageParam, signal),
      getNextPageParam: (last) =>
        last.meta.hasNext ? last.meta.page + 1 : undefined,
      staleTime: STALE.catalog,
    }),
  /** The answers beyond the 3 that come with a question. */
  answers: (questionId: string) =>
    infiniteQueryOptions({
      queryKey: questionKeys.answers(questionId),
      initialPageParam: 1,
      queryFn: ({ pageParam, signal }) =>
        getAnswers(questionId, pageParam, signal),
      getNextPageParam: (last) =>
        last.meta.hasNext ? last.meta.page + 1 : undefined,
      staleTime: STALE.catalog,
    }),
}

/** The Offers panel: the live coupons (not checked against a cart). Rarely changes. */
export const offerQueries = {
  list: () =>
    queryOptions({
      queryKey: [...offerKeys.all, "list"] as const,
      queryFn: ({ signal }) => getOffers(signal),
      staleTime: STALE.static,
    }),
}
