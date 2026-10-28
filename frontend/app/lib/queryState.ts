import type { UseQueryResult } from "@tanstack/react-query"

import { toApiError } from "@/lib/api/errors"
import type { AsyncState } from "@/lib/asyncState"

/**
 * Adapter (9.1): a Query result -> the `AsyncState` the shared `AsyncView` already renders.
 * Query's `status` is about DATA ("pending" = no data yet), `fetchStatus` is about the REQUEST
 * ("fetching" | "paused" | "idle"). A disabled query is `pending` + `idle`: that is our "idle".
 * `isRefreshing` = a request is in flight while data is already on screen (a background refetch).
 */
export type QueryAsync<T> = AsyncState<T> & {
  reload: () => void
  isRefreshing: boolean
}

export function toAsyncState<T>(query: UseQueryResult<T>): QueryAsync<T> {
  const reload = () => void query.refetch()
  switch (query.status) {
    case "success":
      return {
        status: "success",
        data: query.data,
        reload,
        isRefreshing: query.isFetching,
      }
    case "error":
      return {
        status: "error",
        error: toApiError(query.error),
        reload,
        isRefreshing: false,
      }
    case "pending":
      return query.fetchStatus === "idle"
        ? { status: "idle", reload, isRefreshing: false }
        : { status: "loading", reload, isRefreshing: false }
  }
}
