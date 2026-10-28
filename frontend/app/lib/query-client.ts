import { QueryClient } from "@tanstack/react-query"

import { ApiError } from "@/lib/api/errors"

/**
 * Freshness by data type (9.3; the table with reasons is docs/query-policy.md). `staleTime` =
 * how long data counts as fresh: no refetch on mount / window focus / reconnect inside it.
 */
const SECOND = 1000
const MINUTE = 60 * SECOND
export const STALE = {
  /** Categories, brands: change when an editor edits the catalog. */
  static: 30 * MINUTE,
  /** Product lists and details: price/stock may change, but not every second. */
  catalog: 2 * MINUTE,
  /** Stock and price shown on the PDP buy box. */
  live: 20 * SECOND,
  /** Flash-sale accuracy. */
  deals: 15 * SECOND,
  /** Cart: mutation-driven, but another tab or device may change it. */
  cart: 5 * SECOND,
  /** Orders: status changes by events; the active order is polled on top of this. */
  orders: 30 * SECOND,
  /** The user's own saved data (addresses, wishlist, profile): changes only through us. */
  personal: MINUTE,
  /** Always refetch when observed again. */
  none: 0,
} as const

/**
 * Retry only what can change on a second try: network errors, timeouts and 5xx, at most twice.
 * A 4xx (404 product, 401, 409, 422) is a final answer; retrying only delays the error screen
 * by the backoff (1 s, 2 s, ...).
 */
export function shouldRetry(count: number, error: Error): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500)
    return false
  return count < 2
}

/**
 * ONE QueryClient for the whole app, created at module scope: a client created inside a
 * component body would be rebuilt (and its cache lost) on every render. The app runs in SPA
 * mode, so a module singleton is safe; with SSR each request would need its own client
 * (otherwise one user's cache leaks into the next response).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A middle default; every feature picks its own from `STALE` (see queries.ts files).
      staleTime: STALE.catalog,
      // Inactive data is kept 5 minutes after its LAST observer unmounts (the v5 default, said out loud).
      gcTime: 5 * MINUTE,
      retry: shouldRetry,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})

// Dev only: `window.queryClient.invalidateQueries(...)` from the console (9.2).
if (import.meta.env.DEV && typeof window !== "undefined") {
  ;(window as unknown as { queryClient: QueryClient }).queryClient = queryClient
}
