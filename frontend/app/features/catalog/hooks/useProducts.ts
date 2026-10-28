import type { Paginated } from "@/lib/api/envelope"
import { toQueryString } from "@/lib/api/query"
import { useFetch, type FetchResult } from "@/hooks/useFetch"

import { getProductsByQuery } from "../api"
import type { Product, ProductListMeta, ProductQuery } from "../types"

/**
 * One of the hooks on the generic `useFetch` (6.8; deleted in Stage 9 when TanStack
 * Query replaces it). The dependency is the query STRING, a primitive.
 */
export function useProducts(
  params: ProductQuery,
  enabled = true
): FetchResult<Paginated<Product, ProductListMeta>> {
  const queryString = toQueryString(params)
  return useFetch(
    (signal) => getProductsByQuery(queryString, signal),
    [queryString],
    {
      enabled,
    }
  )
}
