import type { RequestHandler } from "express"
import { Router } from "express"
import { authenticate, authorize } from "../../middleware/auth.js"
import { valid, validate } from "../../middleware/validate.js"
import { pageMeta } from "../../utils/pagination.js"
import { noContent, ok } from "../../utils/response.js"
import {
  broadcastSchema,
  listNotificationsSchema,
  notificationIdSchema,
  updatePrefsSchema,
} from "./notification.schema.js"
import * as service from "./notification.service.js"

const uid = (req: Parameters<RequestHandler>[0]) => req.user!.id

export const notificationRoutes = Router()
notificationRoutes.use(authenticate)
notificationRoutes.get("/", validate(listNotificationsSchema), async (req, res) => {
  const { query } = valid<typeof listNotificationsSchema>(req)
  const { items, total, unread } = await service.listNotifications(uid(req), query)
  ok(res, items, { ...pageMeta(query.page, query.limit, total), unreadCount: unread })
})
notificationRoutes.get("/unread-count", async (req, res) => {
  ok(res, { count: await service.unreadCount(uid(req)) })
})
notificationRoutes.get("/preferences", async (req, res) => {
  ok(res, await service.getPrefs(uid(req)))
})
notificationRoutes.patch(
  "/preferences",
  validate(updatePrefsSchema),
  async (req, res) => {
    const { body } = valid<typeof updatePrefsSchema>(req)
    ok(res, await service.updatePrefs(uid(req), body))
  }
)
notificationRoutes.post("/read-all", async (req, res) => {
  ok(res, await service.markAllRead(uid(req)))
})
notificationRoutes.post("/:id/read", validate(notificationIdSchema), async (req, res) => {
  const { params } = valid<typeof notificationIdSchema>(req)
  ok(res, await service.markRead(uid(req), params.id))
})
notificationRoutes.delete("/:id", validate(notificationIdSchema), async (req, res) => {
  const { params } = valid<typeof notificationIdSchema>(req)
  await service.removeNotification(uid(req), params.id)
  noContent(res)
})

export const adminNotificationRoutes = Router()
adminNotificationRoutes.use(authenticate, authorize("admin"))
adminNotificationRoutes.post(
  "/broadcast",
  validate(broadcastSchema),
  async (req, res) => {
    const { body } = valid<typeof broadcastSchema>(req)
    ok(res, await service.broadcast(body), undefined, 201)
  }
)
