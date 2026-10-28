import { useQuery } from "@tanstack/react-query"

import { toAsyncState } from "@/lib/queryState"

import { productQueries } from "../queries"
import type { ProductQuery } from "../types"

/**
 * 9.1: the hand-rolled `useFetch` version of this hook (and its loading/error boilerplate) is
 * gone. The key is the cache identity: same filters = same cache entry, shared by every
 * component that asks. `toAsyncState` keeps the `AsyncView` UI unchanged.
 */
export function useProducts(params: ProductQuery, enabled = true) {
  return toAsyncState(useQuery({ ...productQueries.list(params), enabled }))
}
