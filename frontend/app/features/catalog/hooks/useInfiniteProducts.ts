import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query"

import type { Paginated } from "@/lib/api/envelope"
import { toApiError } from "@/lib/api/errors"

import { productQueries } from "../queries"
import type { Product, ProductListMeta, ProductQuery } from "../types"

type Pages = InfiniteData<Paginated<Product, ProductListMeta>, number>

/** Flatten the pages. DEDUPE by id: a product inserted while scrolling shifts later pages by one. */
const flatten = (data: Pages) => ({
  items: [
    ...new Map(
      data.pages.flatMap((p) => p.items).map((p) => [p._id, p])
    ).values(),
  ],
  total: data.pages.at(-1)!.meta.total,
  facets: data.pages[0]?.meta.facets,
})

/**
 * "Load more" list (9.8): `useInfiniteQuery` replaces the 150-line reducer (page tags, key
 * tagging, busy ref, abort controller, dedupe) with one options object (`productQueries.infinite`)
 * and this adapter, which keeps the status words `InfiniteResults` already speaks.
 * Changing filters is a different key, so it starts from page 1 by construction. An error while
 * fetching page N keeps pages 1..N-1 (`isFetchNextPageError`) and `fetchNextPage` retries just N.
 */
export function useInfiniteProducts(
  query: Omit<ProductQuery, "page">,
  enabled = true
) {
  // The key is the filters WITHOUT `page` (a `?page=2` in the URL must not make a different list).
  const { page: _page, ...filters } = query as ProductQuery
  const q = useInfiniteQuery({
    ...productQueries.infinite(filters),
    enabled,
    select: flatten,
  })
  const status = q.isFetchNextPageError
    ? "error-more"
    : q.isFetchingNextPage
      ? "loading-more"
      : q.status === "error"
        ? "error-first"
        : q.data
          ? "idle"
          : "loading-first"
  return {
    status,
    items: q.data?.items ?? [],
    total: q.data?.total ?? 0,
    facets: q.data?.facets,
    hasNext: q.hasNextPage,
    error: q.error ? toApiError(q.error) : null,
    loadMore: () => void q.fetchNextPage(),
    retryFirst: () => void q.refetch(),
  } as const
}
