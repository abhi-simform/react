import { Router } from "express"
import { authenticate, authorize } from "../../middleware/auth.js"
import { valid, validate } from "../../middleware/validate.js"
import { pageMeta } from "../../utils/pagination.js"
import { ok } from "../../utils/response.js"
import { sellerGetOrder, sellerListOrders } from "./order.admin.service.js"
import {
  adminExport,
  adminGet,
  adminList,
  adminNote,
  adminReturnDecision,
  adminReturnRefund,
  adminReturns,
  adminStatus,
  cancel,
  getOne,
  invoice,
  list,
  place,
  requestReturn,
} from "./order.controller.js"
import {
  addNoteSchema,
  adminExportOrdersSchema,
  adminListOrdersSchema,
  adminReturnDecisionSchema,
  adminReturnRefundSchema,
  adminReturnsSchema,
  adminStatusSchema,
  cancelOrderSchema,
  listOrdersSchema,
  orderIdSchema,
  placeOrderSchema,
  returnOrderSchema,
} from "./order.schema.js"

export const orderRoutes = Router()
orderRoutes.use(authenticate)
orderRoutes.post("/", validate(placeOrderSchema), place)
orderRoutes.get("/", validate(listOrdersSchema), list)
orderRoutes.get("/:id", validate(orderIdSchema), getOne)
orderRoutes.get("/:id/invoice", validate(orderIdSchema), invoice)
orderRoutes.post("/:id/cancel", validate(cancelOrderSchema), cancel)
orderRoutes.post("/:id/return", validate(returnOrderSchema), requestReturn)

// Staff: /admin/orders (the admin app's order management). Sellers get a read-only slice at /seller/orders.
export const adminOrderRoutes = Router()
adminOrderRoutes.use(authenticate, authorize("admin"))
adminOrderRoutes.get("/", validate(adminListOrdersSchema), adminList)
adminOrderRoutes.get("/export.csv", validate(adminExportOrdersSchema), adminExport)
adminOrderRoutes.get("/:id", validate(orderIdSchema), adminGet)
adminOrderRoutes.post("/:id/notes", validate(addNoteSchema), adminNote)
adminOrderRoutes.post("/:id/status", validate(adminStatusSchema), adminStatus)

// Returns queue (the admin app's "Returns" screen): requested -> approved|rejected -> refunded.
export const adminReturnRoutes = Router()
adminReturnRoutes.use(authenticate, authorize("admin"))
adminReturnRoutes.get("/", validate(adminReturnsSchema), adminReturns)
adminReturnRoutes.post(
  "/:id/decision",
  validate(adminReturnDecisionSchema),
  adminReturnDecision
)
adminReturnRoutes.post(
  "/:id/refund",
  validate(adminReturnRefundSchema),
  adminReturnRefund
)

// Seller: /seller/orders. Only orders containing the caller's own products, and only their own lines.
export const sellerOrderRoutes = Router()
sellerOrderRoutes.get("/", validate(listOrdersSchema), async (req, res) => {
  const { query } = valid<typeof listOrdersSchema>(req)
  const { items, total } = await sellerListOrders(req.user!.id, query)
  ok(res, items, pageMeta(query.page, query.limit, total))
})
sellerOrderRoutes.get("/:id", validate(orderIdSchema), async (req, res) => {
  const { params } = valid<typeof orderIdSchema>(req)
  ok(res, await sellerGetOrder(req.user!.id, params.id))
})
