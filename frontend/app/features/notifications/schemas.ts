import { z } from "@/lib/zod"

import { pageMetaSchema } from "@/lib/api/schemas"

export const CATEGORIES = ["orders", "offers", "account"] as const
export type NotificationCategory = (typeof CATEGORIES)[number]

export const notificationSchema = z.object({
  id: z.string(),
  category: z.enum(CATEGORIES),
  /** "order.shipped", "return.approved", "offer.broadcast", ... */
  type: z.string(),
  title: z.string(),
  body: z.string(),
  /** A same-site path (the API only stores those); still validated again before linking. */
  link: z.string().nullable(),
  data: z.record(z.string(), z.unknown()).nullable(),
  read: z.boolean(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
})
export type AppNotification = z.infer<typeof notificationSchema>

/** `GET /notifications`: page meta + the unread total. */
export const notificationListMetaSchema = pageMetaSchema.extend({
  unreadCount: z.number().int(),
})

/** What the socket pushes with `notification:new`. */
export const notificationEventSchema = z.object({
  notification: notificationSchema,
  unreadCount: z.number().int(),
})
export type NotificationEvent = z.infer<typeof notificationEventSchema>

const channelSchema = z.object({ inApp: z.boolean(), email: z.boolean() })
export const prefsSchema = z.object({
  orders: channelSchema,
  offers: channelSchema,
  account: channelSchema,
})
export type NotificationPrefs = z.infer<typeof prefsSchema>

export const markReadResultSchema = z.object({
  notification: notificationSchema,
  unreadCount: z.number().int(),
})

export type NotificationFilter = {
  unread?: boolean
  category?: NotificationCategory
}
