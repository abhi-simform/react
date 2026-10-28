import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { toAsyncState } from "@/lib/queryState"

import { productQueries } from "../queries"
import type { ProductQuery } from "../types"

type Options = {
  enabled?: boolean
  /** Show the previous result (dimmed) while the next filter/page loads: no skeleton flash. */
  keepPrevious?: boolean
  /** Override the list's default freshness (the flash-sale strip needs 15 s). */
  staleTime?: number
}

/**
 * 9.1: the hand-rolled `useFetch` version of this hook (and its loading/error boilerplate) is
 * gone. The key is the cache identity: same filters = same cache entry, shared by every
 * component that asks. `toAsyncState` keeps the `AsyncView` UI unchanged.
 * `keepPrevious` = `placeholderData: keepPreviousData` (9.3): while the new key is pending the
 * query returns the PREVIOUS key's data with `isPlaceholderData: true` (so `isRefreshing`).
 */
export function useProducts(
  params: ProductQuery,
  { enabled = true, keepPrevious = false, staleTime }: Options = {}
) {
  const options = productQueries.list(params)
  return toAsyncState(
    useQuery({
      ...options,
      enabled,
      staleTime: staleTime ?? options.staleTime,
      placeholderData: keepPrevious ? keepPreviousData : undefined,
    })
  )
}
