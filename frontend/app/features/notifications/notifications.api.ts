import { z } from "@/lib/zod"

import { api, apiPaginatedWithMeta } from "@/lib/api/client"

import {
  markReadResultSchema,
  notificationListMetaSchema,
  notificationSchema,
  prefsSchema,
  type NotificationFilter,
  type NotificationPrefs,
} from "./schemas"

export const getNotifications = (
  filter: NotificationFilter,
  page: number,
  limit: number,
  signal?: AbortSignal
) =>
  apiPaginatedWithMeta("/notifications", {
    query: {
      page,
      limit,
      unread: filter.unread ? "true" : undefined,
      category: filter.category,
    },
    schema: notificationSchema,
    metaSchema: notificationListMetaSchema,
    auth: true,
    signal,
  })

export const getUnreadCount = (signal?: AbortSignal): Promise<number> =>
  api("/notifications/unread-count", {
    schema: z.object({ count: z.number().int() }),
    auth: true,
    signal,
  }).then((r) => r.count)

export const markRead = (id: string) =>
  api(`/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
    schema: markReadResultSchema,
    auth: true,
  })

export const markAllRead = () =>
  api("/notifications/read-all", {
    method: "POST",
    schema: z.object({ updated: z.number().int(), unreadCount: z.number() }),
    auth: true,
  })

export const deleteNotification = (id: string) =>
  api(`/notifications/${encodeURIComponent(id)}`, {
    method: "DELETE",
    auth: true,
  })

export const getPrefs = (signal?: AbortSignal): Promise<NotificationPrefs> =>
  api("/notifications/preferences", {
    schema: prefsSchema,
    auth: true,
    signal,
  })

export const patchPrefs = (
  patch: Partial<{
    [K in keyof NotificationPrefs]: Partial<NotificationPrefs[K]>
  }>
): Promise<NotificationPrefs> =>
  api("/notifications/preferences", {
    method: "PATCH",
    body: patch,
    schema: prefsSchema,
    auth: true,
  })
