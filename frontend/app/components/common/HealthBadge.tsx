import { queryOptions, useQuery } from "@tanstack/react-query"

import { getHealth } from "@/lib/api/health"
import { healthKeys } from "@/lib/queryKeys"
import { toAsyncState } from "@/lib/queryState"

const healthQuery = queryOptions({
  queryKey: healthKeys.all,
  queryFn: ({ signal }) => getHealth(signal),
  staleTime: 10_000,
})

/**
 * 4.1 originally checked `/health` in an effect (and logged the StrictMode mount/cleanup pairs);
 * 9.11 moved it to a query: the effect-based version was the last component-level fetch.
 */
export function HealthBadge() {
  const state = toAsyncState(useQuery(healthQuery))
  switch (state.status) {
    case "success":
      return (
        <p>
          API {state.data.status}, db {state.data.db}, up {state.data.uptime}s
        </p>
      )
    case "error":
      return (
        <p role="alert" className="text-destructive">
          Could not reach the API: {state.error.message}
        </p>
      )
    default:
      return <p>Checking API...</p>
  }
}
