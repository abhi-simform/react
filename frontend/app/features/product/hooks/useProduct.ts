import { useQuery, useQueryClient } from "@tanstack/react-query"

import {
  findProductInCache,
  productQueries,
  type ProductDetail,
} from "@/features/catalog"
import { toAsyncState } from "@/lib/queryState"

import { relatedQueries } from "../queries"

/**
 * `GET /products/:slug` as a query: shared by the PDP, prefetch and tests. While the full
 * detail loads, `placeholderData` supplies the basic fields from any cached list that holds
 * the same product (9.7); `isPlaceholder` tells the page the long-form fields are not here yet.
 * Placeholder data is NOT written to the cache and the request is always made.
 */
export function useProduct(
  slug: string,
  seed?: { product: ProductDetail; loadedAt: number }
) {
  const queryClient = useQueryClient()
  const query = useQuery({
    ...productQueries.detail(slug),
    // 14.8: the server already fetched it. `initialDataUpdatedAt` = when, so `staleTime` counts from the server fetch
    // (no immediate refetch on mount, no duplicate request) and the data is revalidated once it is stale.
    ...(seed
      ? { initialData: seed.product, initialDataUpdatedAt: seed.loadedAt }
      : {}),
    placeholderData: () => findProductInCache(queryClient, slug),
  })
  return { ...toAsyncState(query), isPlaceholder: query.isPlaceholderData }
}

/** A few other products from the same category, for the "related" links. */
export const useRelatedProducts = (categorySlug: string, excludeSlug: string) =>
  toAsyncState(useQuery(relatedQueries.list(categorySlug, excludeSlug)))
