import { z } from "zod"
import { CATEGORIES } from "./notification.model.js"

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")
const bool = z.enum(["true", "false"]).transform((v) => v === "true")
// Links stay on our own site: "/deals" yes, "//evil.com" and "https://..." no.
const sitePath = z
  .string()
  .regex(/^\/(?![/\\])[^\s]*$/, "Use a same-site path like /deals")

export const listNotificationsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    unread: bool.optional(),
    category: z.enum(CATEGORIES).optional(),
  }),
}
export const notificationIdSchema = { params: z.object({ id: objectId }) }

const channel = z.object({ inApp: z.boolean().optional(), email: z.boolean().optional() })
export const updatePrefsSchema = {
  body: z
    .object({
      orders: channel.optional(),
      offers: channel.optional(),
      account: channel.optional(),
    })
    .refine((b) => Object.keys(b).length > 0, "Send at least one category"),
}
export const broadcastSchema = {
  body: z.object({
    title: z.string().trim().min(3).max(140),
    body: z.string().trim().max(500).default(""),
    link: sitePath.default("/deals"),
  }),
}
