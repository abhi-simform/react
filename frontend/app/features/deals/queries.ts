import { queryOptions } from "@tanstack/react-query"

import { STALE } from "@/lib/query-client"
import { dealKeys, timeKeys } from "@/lib/queryKeys"

import { getDeals, measureServerOffset } from "./api"
import type { DealsFilter } from "./schemas"

/** The "claimed" bar polls this often (11.2). Query pauses it while the tab is hidden. */
export const CLAIMED_POLL_MS = 15_000

export const dealQueries = {
  list: (filter: DealsFilter = {}) =>
    queryOptions({
      queryKey: dealKeys.list({ status: "active", ...filter }),
      queryFn: ({ signal }) => getDeals(filter, signal),
      staleTime: STALE.deals,
      refetchInterval: CLAIMED_POLL_MS,
    }),
  /** Measured once; re-measured when the tab gets focus again (see `useServerTimeOffset`). */
  serverOffset: () =>
    queryOptions({
      queryKey: timeKeys.offset,
      queryFn: ({ signal }) => measureServerOffset(signal),
      staleTime: Infinity,
      gcTime: Infinity,
      retry: 1,
    }),
}
