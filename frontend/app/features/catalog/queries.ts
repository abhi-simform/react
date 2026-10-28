import { queryOptions } from "@tanstack/react-query"

import { productKeys } from "@/lib/queryKeys"

import { getProducts } from "./api"
import type { ProductQuery } from "./types"

/** `queryOptions` factories (9.2): ONE definition of key + fetcher, reused by hooks, prefetch and tests. */
export const productQueries = {
  list: (filters: ProductQuery) =>
    queryOptions({
      queryKey: productKeys.list(filters),
      queryFn: ({ signal }) => getProducts(filters, signal),
    }),
}
