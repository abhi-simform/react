import { Types } from "mongoose"
import { env } from "../../config/env.js"
import { logger } from "../../config/logger.js"
import { emitToUser } from "../../realtime/socket.js"
import { ApiError } from "../../utils/ApiError.js"
import { sendEmail } from "../../utils/email.js"
import { User } from "../users/user.model.js"
import {
  CATEGORIES,
  Notification,
  toPublicNotification,
  type Category,
  type NotificationDoc,
} from "./notification.model.js"
import { emailHtml, type Template } from "./notification.templates.js"

export type Prefs = Record<Category, { inApp: boolean; email: boolean }>

const DEFAULTS: Prefs = {
  orders: { inApp: true, email: true },
  offers: { inApp: true, email: false },
  account: { inApp: true, email: true },
}

type RawPrefs = Partial<
  Record<Category, { inApp?: boolean | null; email?: boolean | null } | null>
>

function readPrefs(raw: RawPrefs | undefined) {
  return Object.fromEntries(
    CATEGORIES.map((c) => [
      c,
      {
        inApp: raw?.[c]?.inApp ?? DEFAULTS[c].inApp,
        email: raw?.[c]?.email ?? DEFAULTS[c].email,
      },
    ])
  ) as Prefs
}

export const unreadCount = (userId: string) =>
  Notification.countDocuments({ user: userId, readAt: { $exists: false } })

/**
 * The one door for telling a user something. Honours their preferences per channel: in-app stores
 * a notification and pushes it over the socket (`notification:new`, with the fresh unread count so
 * the badge needs no second request); email is sent when the template asks for it AND the user
 * allows it. It never throws: a failed notification must not fail the order change that caused it.
 */
export async function notify(
  userId: string,
  t: Template,
  data?: Record<string, unknown>
) {
  try {
    const user = await User.findById(userId).select("name email notificationPrefs").lean()
    if (!user) return null
    const prefs = readPrefs(user.notificationPrefs ?? undefined)[t.category]
    let created: NotificationDoc | null = null
    if (prefs.inApp) {
      created = (
        await Notification.create({
          user: userId,
          category: t.category,
          type: t.type,
          title: t.title,
          body: t.body,
          link: t.link,
          data,
        })
      ).toObject() as NotificationDoc
      emitToUser(userId, "notification:new", {
        notification: toPublicNotification(created),
        unreadCount: await unreadCount(userId),
      })
    }
    if (t.email && prefs.email)
      void sendEmail(user.email, t.title, emailHtml(user.name, t, env.CLIENT_URL, t.link))
    return created
  } catch (err) {
    logger.error({ err, userId, type: t.type }, "notify failed")
    return null
  }
}

export async function listNotifications(
  userId: string,
  q: { page: number; limit: number; unread?: boolean; category?: Category }
) {
  const filter: Record<string, unknown> = { user: new Types.ObjectId(userId) }
  if (q.unread) filter.readAt = { $exists: false }
  if (q.category) filter.category = q.category
  const [rows, total, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean<NotificationDoc[]>(),
    Notification.countDocuments(filter),
    unreadCount(userId),
  ])
  return { items: rows.map(toPublicNotification), total, unread }
}

/** Idempotent: reading twice keeps the first readAt. Someone else's id is 404. */
export async function markRead(userId: string, id: string) {
  const n = await Notification.findOneAndUpdate(
    { _id: id, user: userId, readAt: { $exists: false } },
    { $set: { readAt: new Date() } },
    { returnDocument: "after" }
  ).lean<NotificationDoc>()
  const current =
    n ?? (await Notification.findOne({ _id: id, user: userId }).lean<NotificationDoc>())
  if (!current) throw ApiError.notFound("Notification not found")
  return {
    notification: toPublicNotification(current),
    unreadCount: await unreadCount(userId),
  }
}

export async function markAllRead(userId: string) {
  const res = await Notification.updateMany(
    { user: userId, readAt: { $exists: false } },
    { $set: { readAt: new Date() } }
  )
  return { updated: res.modifiedCount, unreadCount: 0 }
}

export async function removeNotification(userId: string, id: string) {
  const res = await Notification.deleteOne({ _id: id, user: userId })
  if (!res.deletedCount) throw ApiError.notFound("Notification not found")
}

export async function getPrefs(userId: string) {
  const user = await User.findById(userId).select("notificationPrefs").lean()
  if (!user) throw ApiError.notFound("User not found")
  return readPrefs(user.notificationPrefs ?? undefined)
}

export async function updatePrefs(
  userId: string,
  patch: Partial<Record<Category, { inApp?: boolean; email?: boolean }>>
) {
  const set: Record<string, boolean> = {}
  for (const c of CATEGORIES)
    for (const ch of ["inApp", "email"] as const) {
      const v = patch[c]?.[ch]
      if (v !== undefined) set[`notificationPrefs.${c}.${ch}`] = v
    }
  if (Object.keys(set).length) await User.updateOne({ _id: userId }, { $set: set })
  return getPrefs(userId)
}

/** Admin broadcast (offers): one notification per opted-in customer, pushed live. */
export async function broadcast(t: Pick<Template, "title" | "body" | "link">) {
  const users = await User.find({ role: "customer", isActive: true })
    .select("_id notificationPrefs")
    .limit(5000)
    .lean()
  let sent = 0
  for (const u of users) {
    if (!readPrefs(u.notificationPrefs ?? undefined).offers.inApp) continue
    await notify(String(u._id), {
      ...t,
      category: "offers",
      type: "offer.broadcast",
      email: false,
    })
    sent++
  }
  return { sent }
}
