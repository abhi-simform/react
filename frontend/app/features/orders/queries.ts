import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"

import { STALE } from "@/lib/query-client"
import { orderKeys } from "@/lib/queryKeys"

import { getOrder, getOrders, type OrdersFilter } from "./orders.api"
import type { OrderStatus } from "@/types/domain"

import { isTerminal } from "./status"

/**
 * Polling (11.4, 11.5). Waiting for a payment is the one moment the shopper stares at the page,
 * so `pending_payment` polls every 3 s, but only for PENDING_CAP_MS after this page first saw it
 * pending (after that "Check now" restarts it): a webhook-driven order must not be hammered
 * forever by a forgotten tab. Active orders (placed ... out for delivery) poll every 10 s until a
 * terminal status; 11.9 swaps that for sockets.
 */
export const PENDING_POLL_MS = 3000
export const ACTIVE_POLL_MS = 10_000
const PENDING_CAP_MS = 3 * 60_000
const pendingSince = new Map<string, number>()

/** "Check now": forget when we started waiting, so polling runs for another full window. */
export const restartPendingPolling = (orderId: string) =>
  pendingSince.delete(orderId)

function pollInterval(orderId: string, status: OrderStatus): number | false {
  if (status === "pending_payment") {
    const since = pendingSince.get(orderId) ?? Date.now()
    pendingSince.set(orderId, since)
    return Date.now() - since > PENDING_CAP_MS ? false : PENDING_POLL_MS
  }
  pendingSince.delete(orderId)
  return isTerminal(status) ? false : ACTIVE_POLL_MS
}

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
        query.state.data ? pollInterval(id, query.state.data.status) : false,
    }),
}
