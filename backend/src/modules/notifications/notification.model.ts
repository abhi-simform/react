import { Schema, model, Types, type InferSchemaType } from "mongoose"

/** Preference groups. Each has an in-app and an email switch (see User.notificationPrefs). */
export const CATEGORIES = ["orders", "offers", "account"] as const
export type Category = (typeof CATEGORIES)[number]

const schema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true },
    category: { type: String, enum: CATEGORIES, required: true },
    // Finer grained than category, used by the UI for the icon: "order.shipped", "return.approved", ...
    type: { type: String, required: true },
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, default: "", maxlength: 500 },
    link: String, // same-site path, e.g. /orders/<id>
    data: { type: Schema.Types.Mixed },
    readAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)
schema.index({ user: 1, createdAt: -1, _id: -1 })
schema.index({ user: 1, readAt: 1 }) // unread count
// Old notifications clean themselves up (90 days).
schema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 86_400 })

export type NotificationDoc = InferSchemaType<typeof schema> & {
  _id: Types.ObjectId
  createdAt: Date
}
export const Notification = model("Notification", schema)

export function toPublicNotification(n: NotificationDoc) {
  return {
    id: String(n._id),
    category: n.category,
    type: n.type,
    title: n.title,
    body: n.body ?? "",
    link: n.link ?? null,
    data: (n.data as Record<string, unknown> | undefined) ?? null,
    read: Boolean(n.readAt),
    readAt: n.readAt ?? null,
    createdAt: n.createdAt,
  }
}
