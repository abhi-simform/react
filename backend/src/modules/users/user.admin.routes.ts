import { Router } from "express"
import { authenticate, authorize } from "../../middleware/auth.js"
import { valid, validate } from "../../middleware/validate.js"
import { pageMeta } from "../../utils/pagination.js"
import { ok } from "../../utils/response.js"
import {
  changeRoleSchema,
  changeStatusSchema,
  listUsersSchema,
  userIdSchema,
} from "./user.admin.schema.js"
import * as service from "./user.admin.service.js"

// B11 (admin): customers and sellers. Role changes and deactivation are audited by the /admin mount.
export const adminUserRoutes = Router()
adminUserRoutes.use(authenticate, authorize("admin"))
adminUserRoutes.get("/", validate(listUsersSchema), async (req, res) => {
  const { query } = valid<typeof listUsersSchema>(req)
  const { items, total } = await service.listUsers(query)
  ok(res, items, pageMeta(query.page, query.limit, total))
})
adminUserRoutes.get("/:id", validate(userIdSchema), async (req, res) => {
  const { params } = valid<typeof userIdSchema>(req)
  ok(res, await service.getUser(params.id))
})
adminUserRoutes.patch("/:id/role", validate(changeRoleSchema), async (req, res) => {
  const { params, body } = valid<typeof changeRoleSchema>(req)
  ok(res, await service.changeRole(req.user!.id, params.id, body.role))
})
adminUserRoutes.patch("/:id/status", validate(changeStatusSchema), async (req, res) => {
  const { params, body } = valid<typeof changeStatusSchema>(req)
  ok(res, await service.setActive(req.user!.id, params.id, body.isActive))
})
