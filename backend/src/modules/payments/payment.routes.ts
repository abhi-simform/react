import { Router } from "express"
import { isProd } from "../../config/env.js"
import { authenticate, authorize } from "../../middleware/auth.js"
import { validate } from "../../middleware/validate.js"
import { ApiError } from "../../utils/ApiError.js"
import {
  adminList,
  adminRefund,
  config,
  createOrder,
  list,
  mockPay,
  simulate,
  verify,
  webhook,
} from "./payment.controller.js"
import {
  createPaymentOrderSchema,
  listPaymentsSchema,
  mockPaySchema,
  refundSchema,
  simulateWebhookSchema,
  verifyPaymentSchema,
} from "./payment.schema.js"

export const paymentRoutes = Router()
paymentRoutes.get("/config", config)
// Public on purpose: authenticated by the HMAC signature over the raw body, not by a token.
paymentRoutes.post("/webhook", webhook)
paymentRoutes.use(authenticate)
paymentRoutes.post("/create-order", validate(createPaymentOrderSchema), createOrder)
paymentRoutes.post("/verify", validate(verifyPaymentSchema), verify)
paymentRoutes.get("/", validate(listPaymentsSchema), list)

// Local-only helpers: the mock gateway's "modal" and a signed-webhook simulator.
const devOnly = (_req: unknown, _res: unknown, next: (e?: unknown) => void) =>
  isProd ? next(ApiError.notFound()) : next()
paymentRoutes.post("/mock/pay", devOnly, validate(mockPaySchema), mockPay)
paymentRoutes.post("/dev/webhook", devOnly, validate(simulateWebhookSchema), simulate)

export const adminPaymentRoutes = Router()
adminPaymentRoutes.use(authenticate, authorize("admin"))
adminPaymentRoutes.get("/", validate(listPaymentsSchema), adminList)
adminPaymentRoutes.post("/:id/refund", validate(refundSchema), adminRefund)
