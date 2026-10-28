import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"

import { getProducts } from "@/features/catalog"
import { STALE } from "@/lib/query-client"
import {
  questionKeys,
  relatedKeys,
  reviewKeys,
  similarKeys,
} from "@/lib/queryKeys"

import { getQuestions, getReviews } from "./reviews.api"

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

/** Reviews, "load more" style (9.8). `failPage` is the dev demo for an error on page N. */
export const reviewQueries = {
  infinite: (productId: string, failPage?: number) =>
    infiniteQueryOptions({
      queryKey: reviewKeys.list(productId, { failPage }),
      initialPageParam: 1,
      queryFn: ({ pageParam, signal }) =>
        getReviews(productId, { page: pageParam, failPage, signal }),
      getNextPageParam: (last) =>
        last.meta.hasNext ? last.meta.page + 1 : undefined,
      staleTime: STALE.catalog,
      retry: failPage ? false : undefined, // the demo failure should show at once
    }),
}

export const questionQueries = {
  list: (productId: string, fail = false) =>
    queryOptions({
      queryKey: questionKeys.list(productId, { fail }),
      queryFn: ({ signal }) => getQuestions(productId, signal, fail),
      staleTime: STALE.catalog,
      retry: fail ? false : undefined,
    }),
}

/** "Similar products": same category, most popular, minus this one (needs the product's category). */
export const similarQueries = {
  list: (productId: string, categorySlug: string) =>
    queryOptions({
      queryKey: similarKeys.list(productId),
      queryFn: async ({ signal }) =>
        (
          await getProducts(
            { category: categorySlug, limit: 7, sort: "popularity" },
            signal
          )
        ).items
          .filter((p) => p._id !== productId)
          .slice(0, 6),
      staleTime: STALE.catalog,
    }),
}
