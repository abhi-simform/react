import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"

import { STALE } from "@/lib/query-client"
import { notificationKeys } from "@/lib/queryKeys"

import { getNotifications, getPrefs, getUnreadCount } from "./notifications.api"
import type { NotificationFilter } from "./schemas"

export const LATEST = 10
// The API allows up to 50 per page: the history is long and virtualised (13.4), fewer round trips.
export const PAGE = 50

/**
 * Freshness: socket events keep these current (`setQueryData`/invalidate in `RealtimeSync`), so
 * the staleTime only matters while the socket is down or for the first load.
 */
export const notificationQueries = {
  unreadCount: () =>
    queryOptions({
      queryKey: notificationKeys.unread(),
      queryFn: ({ signal }) => getUnreadCount(signal),
      staleTime: STALE.orders,
    }),
  /** The bell dropdown: the 10 newest. */
  latest: () =>
    queryOptions({
      queryKey: notificationKeys.latest(),
      queryFn: async ({ signal }) =>
        (await getNotifications({}, 1, LATEST, signal)).items,
      staleTime: STALE.orders,
    }),
  /** `/account/notifications`: the full list, "load more", filtered (the filter is in the URL). */
  infinite: (filter: NotificationFilter) =>
    infiniteQueryOptions({
      queryKey: notificationKeys.list(filter),
      initialPageParam: 1,
      queryFn: ({ pageParam, signal }) =>
        getNotifications(filter, pageParam, PAGE, signal),
      getNextPageParam: (last) =>
        last.meta.hasNext ? last.meta.page + 1 : undefined,
      staleTime: STALE.orders,
    }),
  prefs: () =>
    queryOptions({
      queryKey: notificationKeys.prefs(),
      queryFn: ({ signal }) => getPrefs(signal),
      staleTime: STALE.personal,
    }),
}
