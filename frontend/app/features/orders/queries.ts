import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"

import { STALE } from "@/lib/query-client"
import { orderKeys } from "@/lib/queryKeys"

import { getOrder, getOrders, type OrdersFilter } from "./orders.api"
import { isTerminal } from "./status"

const POLL_MS = 5000

export const orderQueries = {
  /** The orders list, "load more" style, filtered by status/search (both live in the URL). */
  infinite: (filter: OrdersFilter) =>
    infiniteQueryOptions({
      queryKey: orderKeys.list(filter),
      initialPageParam: 1,
      queryFn: ({ pageParam, signal }) => getOrders(filter, pageParam, signal),
      getNextPageParam: (last) =>
        last.meta.hasNext ? last.meta.page + 1 : undefined,
      staleTime: STALE.orders,
    }),
  /**
   * One order. `refetchInterval` is a FUNCTION of the data, so polling stops by itself at a
   * terminal status: `false` = no interval. Query pauses the interval while the tab is hidden
   * (`refetchIntervalInBackground` defaults to false) and stops it when no component observes the
   * query any more (navigating away), so no interval can leak.
   */
  detail: (id: string) =>
    queryOptions({
      queryKey: orderKeys.detail(id),
      queryFn: ({ signal }) => getOrder(id, signal),
      staleTime: STALE.orders,
      refetchInterval: (query) =>
        query.state.data && !isTerminal(query.state.data.status)
          ? POLL_MS
          : false,
    }),
}
