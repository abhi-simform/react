import { useMutation, useQueryClient } from "@tanstack/react-query"

import { notificationKeys } from "@/lib/queryKeys"

import { findCached, setReadInCaches } from "../cache"
import {
  deleteNotification,
  markAllRead,
  markRead,
  patchPrefs,
} from "../notifications.api"
import type { NotificationPrefs } from "../schemas"

/**
 * Mark one read, OPTIMISTICALLY: the dot and the badge change at once (`onMutate`), and a failure
 * puts both back (`onError`). Only an unread notification moves the badge, so clicking an
 * already-read one (or two quick clicks) cannot take it below the truth; the server's
 * `unreadCount` then replaces our arithmetic (`onSuccess`).
 */
export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markRead,
    meta: { silent: true },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.unread() })
      const wasUnread = findCached(queryClient, id)?.read === false
      const previousCount = queryClient.getQueryData<number>(
        notificationKeys.unread()
      )
      setReadInCaches(queryClient, id, true)
      if (wasUnread && previousCount !== undefined)
        queryClient.setQueryData(
          notificationKeys.unread(),
          Math.max(0, previousCount - 1)
        )
      return { wasUnread, previousCount }
    },
    onError: (_e, id, ctx) => {
      if (ctx?.wasUnread) setReadInCaches(queryClient, id, false)
      if (ctx?.previousCount !== undefined)
        queryClient.setQueryData(notificationKeys.unread(), ctx.previousCount)
    },
    onSuccess: (result) =>
      queryClient.setQueryData(notificationKeys.unread(), result.unreadCount),
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      queryClient.setQueryData(notificationKeys.unread(), 0)
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteNotification,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}

/** Preferences: toggles flip at once and roll back if the PATCH fails. */
export function useUpdatePrefs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: patchPrefs,
    meta: { silent: true },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.prefs() })
      const previous = queryClient.getQueryData<NotificationPrefs>(
        notificationKeys.prefs()
      )
      if (previous)
        queryClient.setQueryData<NotificationPrefs>(notificationKeys.prefs(), {
          orders: { ...previous.orders, ...patch.orders },
          offers: { ...previous.offers, ...patch.offers },
          account: { ...previous.account, ...patch.account },
        })
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous)
        queryClient.setQueryData(notificationKeys.prefs(), ctx.previous)
    },
    onSuccess: (prefs) =>
      queryClient.setQueryData(notificationKeys.prefs(), prefs),
  })
}
