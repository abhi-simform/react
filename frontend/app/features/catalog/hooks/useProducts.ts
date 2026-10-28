import type { Paginated } from "@/lib/api/envelope"
import { toQueryString } from "@/lib/api/query"
import type { AsyncState } from "@/lib/asyncState"
import { useAsyncResource } from "@/hooks/useAsyncResource"

import { getProductsByQuery } from "../api"
import type { Product, ProductListMeta, ProductQuery } from "../types"

/**
 * Hand-rolled fetch (deleted in Stage 9 when TanStack Query replaces it).
 * The key is the query STRING, a primitive: depending on the `params` object
 * would re-run the effect on every render (new object each time).
 */
export function useProducts(
  params: ProductQuery
): AsyncState<Paginated<Product, ProductListMeta>> & { reload: () => void } {
  const queryString = toQueryString(params)
  return useAsyncResource(queryString, (signal) =>
    getProductsByQuery(queryString, signal)
  )
}
