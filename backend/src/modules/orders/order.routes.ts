import { Router } from "express"
import { authenticate, authorize } from "../../middleware/auth.js"
import { validate } from "../../middleware/validate.js"
import {
  adminList,
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

// Staff: /admin/orders (the admin app's order management; sellers get their slice in B11).
export const adminOrderRoutes = Router()
adminOrderRoutes.use(authenticate, authorize("admin"))
adminOrderRoutes.get("/", validate(listOrdersSchema), adminList)
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
