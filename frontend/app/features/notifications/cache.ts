import type { InfiniteData, QueryClient } from "@tanstack/react-query"

import type { Paginated } from "@/lib/api/envelope"
import { notificationKeys } from "@/lib/queryKeys"

import { LATEST } from "./queries"
import type { AppNotification, NotificationEvent } from "./schemas"

type ListPage = Paginated<
  AppNotification,
  { unreadCount: number } & Paginated<AppNotification>["meta"]
>

/** A `notification:new` event: bump the badge, prepend to the dropdown, refetch the full list. */
export function applyNotificationEvent(
  queryClient: QueryClient,
  ev: NotificationEvent
) {
  queryClient.setQueryData(notificationKeys.unread(), ev.unreadCount)
  queryClient.setQueryData<AppNotification[]>(
    notificationKeys.latest(),
    (old) =>
      old
        ? [
            ev.notification,
            ...old.filter((n) => n.id !== ev.notification.id), // a duplicate delivery changes nothing
          ].slice(0, LATEST)
        : old
  )
  // Pages of the full list shift by one: let Query refetch the ones on screen.
  void queryClient.invalidateQueries({
    queryKey: [...notificationKeys.all, "list"],
  })
}

/** Set `read` on one notification everywhere it is cached (dropdown + every list filter). */
export function setReadInCaches(
  queryClient: QueryClient,
  id: string,
  read: boolean
) {
  const patch = (n: AppNotification): AppNotification =>
    n.id === id
      ? {
          ...n,
          read,
          readAt: read ? (n.readAt ?? new Date().toISOString()) : null,
        }
      : n
  queryClient.setQueryData<AppNotification[]>(
    notificationKeys.latest(),
    (old) => old?.map(patch)
  )
  queryClient.setQueriesData<InfiniteData<ListPage>>(
    { queryKey: [...notificationKeys.all, "list"] },
    (old) =>
      old && {
        ...old,
        pages: old.pages.map((p) => ({ ...p, items: p.items.map(patch) })),
      }
  )
}

export function findCached(
  queryClient: QueryClient,
  id: string
): AppNotification | undefined {
  const latest = queryClient.getQueryData<AppNotification[]>(
    notificationKeys.latest()
  )
  const hit = latest?.find((n) => n.id === id)
  if (hit) return hit
  for (const [, data] of queryClient.getQueriesData<InfiniteData<ListPage>>({
    queryKey: [...notificationKeys.all, "list"],
  })) {
    for (const page of data?.pages ?? []) {
      const found = page.items.find((n) => n.id === id)
      if (found) return found
    }
  }
  return undefined
}
