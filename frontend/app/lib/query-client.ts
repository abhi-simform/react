import { MutationCache, QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

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

declare module "@tanstack/react-query" {
  interface Register {
    /** `silent: true` = this mutation reports its own errors; skip the global toast. */
    mutationMeta: { silent?: boolean }
  }
}

/**
 * Which failures deserve the ONE generic toast? The unexpected ones: network, timeout, 5xx
 * (and non-ApiErrors). A 4xx (422 field errors, 409 conflict, 404) is something the caller
 * knows how to explain, so it handles it itself.
 */
export function isUnexpected(error: unknown): boolean {
  return (
    !(error instanceof ApiError) || error.status === 0 || error.status >= 500
  )
}

/**
 * 14.8 (SSR experiment): a FACTORY. In the browser there is one client for the page's lifetime (below). On the server
 * a module-level client would be shared by every request: one user's cached cart or profile could end up in the next
 * user's HTML. `root.tsx` therefore builds a fresh client per server render.
 */
export const createQueryClient = () =>
  new QueryClient({
    // The global mutation error handler (9.4): one consistent toast for unexpected failures. A
    // fixed toast `id` makes Sonner REPLACE it instead of stacking, so a burst of failures (or a
    // handler that also toasts) still shows exactly one. `meta: { silent: true }` opts out.
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.silent || !isUnexpected(error)) return
        toast.error("Something went wrong on our side", {
          id: "mutation-error",
          description: error instanceof ApiError ? error.message : undefined,
        })
      },
    }),
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

/** The browser's one client (module scope: a client made inside a component would be rebuilt on every render). */
export const queryClient = createQueryClient()

// Dev only: `window.queryClient.invalidateQueries(...)` from the console (9.2).
if (import.meta.env.DEV && typeof window !== "undefined") {
  ;(window as unknown as { queryClient: QueryClient }).queryClient = queryClient
}
