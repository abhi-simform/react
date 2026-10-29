import type { RequestHandler } from "express"
import { valid } from "../../middleware/validate.js"
import { ApiError } from "../../utils/ApiError.js"
import { pageMeta } from "../../utils/pagination.js"
import { ok } from "../../utils/response.js"
import { auditChange } from "../audit/audit.service.js"
import { toPublicOrder } from "../orders/order.model.js"
import { toPublicPayment, Payment } from "./payment.model.js"
import * as service from "./payment.service.js"
import {
  refundKeySchema,
  type createPaymentOrderSchema,
  type listPaymentsSchema,
  type mockPaySchema,
  type refundSchema,
  type simulateWebhookSchema,
  type verifyPaymentSchema,
} from "./payment.schema.js"

const uid = (req: Parameters<RequestHandler>[0]) => req.user!.id

export const config: RequestHandler = (_req, res) => ok(res, service.paymentConfig())

export const createOrder: RequestHandler = async (req, res) => {
  const { body } = valid<typeof createPaymentOrderSchema>(req)
  ok(res, await service.createPaymentOrder(uid(req), body.orderId))
}

export const verify: RequestHandler = async (req, res) => {
  const { body } = valid<typeof verifyPaymentSchema>(req)
  ok(res, toPublicOrder(await service.verifyPayment(uid(req), body)))
}

/** Public (Razorpay's servers call it): trust nothing but the signature over the RAW body. */
export const webhook: RequestHandler = async (req, res) => {
  const raw = req.rawBody
  if (!raw) throw ApiError.badRequest("Missing webhook body")
  const sig = req.headers["x-razorpay-signature"]
  const id = req.headers["x-razorpay-event-id"]
  const result = await service.processWebhook(
    raw,
    typeof sig === "string" ? sig : undefined,
    typeof id === "string" ? id : undefined
  )
  ok(res, result) // always 200 once the signature is good, even for events we ignore (else Razorpay retries)
}

export const list: RequestHandler = async (req, res) => {
  const { query } = valid<typeof listPaymentsSchema>(req)
  const { items, total } = await service.listPayments(uid(req), query)
  ok(res, items.map(toPublicPayment), pageMeta(query.page, query.limit, total))
}

export const mockPay: RequestHandler = async (req, res) => {
  const { body } = valid<typeof mockPaySchema>(req)
  ok(res, await service.mockPay(uid(req), body))
}

export const simulate: RequestHandler = async (req, res) => {
  const { body } = valid<typeof simulateWebhookSchema>(req)
  ok(res, await service.simulateWebhook(uid(req), body))
}

export const adminList: RequestHandler = async (req, res) => {
  const { query } = valid<typeof listPaymentsSchema>(req)
  const { items, total } = await service.listPayments(null, query)
  ok(res, items.map(toPublicPayment), pageMeta(query.page, query.limit, total))
}

export const adminRefund: RequestHandler = async (req, res) => {
  const { params, body } = valid<typeof refundSchema>(req)
  const rawKey = req.headers["idempotency-key"]
  let key: string | undefined
  if (rawKey !== undefined) {
    const parsed = refundKeySchema.safeParse(rawKey)
    if (!parsed.success)
      throw new ApiError(
        400,
        "IDEMPOTENCY_KEY_INVALID",
        "Idempotency-Key must be 8-100 url-safe characters (e.g. a UUID)"
      )
    key = parsed.data
  }
  const payment = await Payment.findById(params.id)
  if (!payment) throw ApiError.notFound("Payment not found")
  const prior = key ? payment.refunds.find((r) => r.idempotencyKey === key) : undefined
  if (prior) {
    // Same key, different request = a client bug, not a retry.
    if (body.amount !== undefined && body.amount !== prior.amount)
      throw new ApiError(
        422,
        "IDEMPOTENCY_KEY_REUSED",
        "This Idempotency-Key was already used for a different refund amount"
      )
    res.setHeader("Idempotent-Replayed", "true")
    res.locals.auditSkip = true // a replay changed nothing: no second audit row
    return ok(res, toPublicPayment(payment))
  }
  const before = toPublicPayment(payment)
  const after = toPublicPayment(
    await service.refundOrder(String(payment.order), { ...body, idempotencyKey: key })
  )
  ok(res, auditChange(res, before, after, ["refundedAmount"]))
}
