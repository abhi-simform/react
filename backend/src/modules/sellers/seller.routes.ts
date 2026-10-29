import { Router } from "express"
import { authenticate, authorize } from "../../middleware/auth.js"
import { valid, validate } from "../../middleware/validate.js"
import { pageMeta } from "../../utils/pagination.js"
import { created, ok } from "../../utils/response.js"
import { auditChange } from "../audit/audit.service.js"
import {
  applySchema,
  decisionSchema,
  listApplicationsSchema,
  sellerIdSchema,
} from "./seller.schema.js"
import * as service from "./seller.service.js"

/** Mounted at /seller-applications: any signed-in customer can apply and read their own status. */
export const sellerApplicationRoutes = Router()
sellerApplicationRoutes.use(authenticate)
sellerApplicationRoutes.post("/", validate(applySchema), async (req, res) => {
  const { body } = valid<typeof applySchema>(req)
  created(res, await service.apply(req.user!.id, body))
})
sellerApplicationRoutes.get("/mine", async (req, res) => {
  ok(res, await service.mine(req.user!.id))
})

/** Mounted at /admin/seller-applications and /admin/sellers. */
export const adminSellerApplicationRoutes = Router()
adminSellerApplicationRoutes.use(authenticate, authorize("admin"))
adminSellerApplicationRoutes.get(
  "/",
  validate(listApplicationsSchema),
  async (req, res) => {
    const { query } = valid<typeof listApplicationsSchema>(req)
    const { items, total } = await service.listApplications(query)
    ok(res, items, pageMeta(query.page, query.limit, total))
  }
)
adminSellerApplicationRoutes.post(
  "/:id/decision",
  validate(decisionSchema),
  async (req, res) => {
    const { params, body } = valid<typeof decisionSchema>(req)
    const after = await service.decide(req.user!.id, params.id, body.decision, body.note)
    ok(res, auditChange(res, { status: "pending" }, after, ["status", "reviewNote"]))
  }
)

export const adminSellerRoutes = Router()
adminSellerRoutes.use(authenticate, authorize("admin"))
adminSellerRoutes.get("/:id", validate(sellerIdSchema), async (req, res) => {
  const { params } = valid<typeof sellerIdSchema>(req)
  ok(res, await service.sellerDetail(params.id))
})
