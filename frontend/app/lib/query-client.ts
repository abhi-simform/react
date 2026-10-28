import { QueryClient } from "@tanstack/react-query"

/**
 * ONE QueryClient for the whole app, created at module scope: a client created inside a
 * component body would be rebuilt (and its cache lost) on every render. The app runs in SPA
 * mode, so a module singleton is safe; with SSR each request would need its own client
 * (otherwise one user's cache leaks into the next response).
 *
 * Defaults are tuned per data type in 9.3 (see docs/query-policy.md).
 */
export const queryClient = new QueryClient()

// Dev only: `window.queryClient.invalidateQueries(...)` from the console (9.2).
if (import.meta.env.DEV && typeof window !== "undefined") {
  ;(window as unknown as { queryClient: QueryClient }).queryClient = queryClient
}
