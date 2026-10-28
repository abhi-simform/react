import { Router } from "express"
import { authenticate, authorize } from "../../middleware/auth.js"
import { validate } from "../../middleware/validate.js"
import {
  adminList,
  adminStatus,
  cancel,
  getOne,
  invoice,
  list,
  place,
  requestReturn,
} from "./order.controller.js"
import {
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
