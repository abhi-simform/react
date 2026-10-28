import type { RequestHandler } from "express"
import { valid } from "../../middleware/validate.js"
import { ApiError } from "../../utils/ApiError.js"
import { pageMeta } from "../../utils/pagination.js"
import { ok } from "../../utils/response.js"
import { streamInvoice } from "./invoice.js"
import { toPublicOrder } from "./order.model.js"
import * as service from "./order.service.js"
import {
  idempotencyKeySchema,
  type adminReturnDecisionSchema,
  type adminReturnRefundSchema,
  type adminReturnsSchema,
  type adminStatusSchema,
  type cancelOrderSchema,
  type listOrdersSchema,
  type orderIdSchema,
  type placeOrderSchema,
  type returnOrderSchema,
} from "./order.schema.js"

const uid = (req: Parameters<RequestHandler>[0]) => req.user!.id

export const place: RequestHandler = async (req, res) => {
  const { body } = valid<typeof placeOrderSchema>(req)
  const key = idempotencyKeySchema.safeParse(req.headers["idempotency-key"])
  if (!key.success)
    throw new ApiError(
      400,
      "IDEMPOTENCY_KEY_REQUIRED",
      "Send an Idempotency-Key header (8-100 url-safe characters, e.g. a UUID), one per checkout attempt"
    )
  const { order, replayed } = await service.placeOrder(uid(req), key.data, body)
  if (replayed) res.setHeader("Idempotent-Replayed", "true")
  ok(res, toPublicOrder(order), undefined, replayed ? 200 : 201)
}

export const list: RequestHandler = async (req, res) => {
  const { query } = valid<typeof listOrdersSchema>(req)
  const { items, total } = await service.listOrders(uid(req), query)
  ok(res, items.map(toPublicOrder), pageMeta(query.page, query.limit, total))
}

export const getOne: RequestHandler = async (req, res) => {
  const { params } = valid<typeof orderIdSchema>(req)
  ok(res, toPublicOrder(await service.getOwnedOrder(uid(req), params.id)))
}

export const cancel: RequestHandler = async (req, res) => {
  const { params, body } = valid<typeof cancelOrderSchema>(req)
  ok(res, toPublicOrder(await service.cancelOrder(uid(req), params.id, body.reason)))
}

export const requestReturn: RequestHandler = async (req, res) => {
  const { params, body } = valid<typeof returnOrderSchema>(req)
  ok(res, toPublicOrder(await service.requestReturn(uid(req), params.id, body)))
}

export const invoice: RequestHandler = async (req, res) => {
  const { params } = valid<typeof orderIdSchema>(req)
  const order = await service.getOwnedOrder(uid(req), params.id)
  if (order.status === "pending_payment" || order.status === "cancelled")
    throw new ApiError(
      409,
      "INVOICE_NOT_AVAILABLE",
      "An invoice is available once the order is confirmed and not cancelled"
    )
  streamInvoice(res, order)
}

// ---- admin ----
export const adminList: RequestHandler = async (req, res) => {
  const { query } = valid<typeof listOrdersSchema>(req)
  const { items, total } = await service.listOrders(null, query)
  ok(res, items.map(toPublicOrder), pageMeta(query.page, query.limit, total))
}

export const adminStatus: RequestHandler = async (req, res) => {
  const { params, body } = valid<typeof adminStatusSchema>(req)
  ok(
    res,
    toPublicOrder(
      await service.transitionOrder(uid(req), params.id, body.status, body.note)
    )
  )
}

export const adminReturns: RequestHandler = async (req, res) => {
  const { query } = valid<typeof adminReturnsSchema>(req)
  const { items, total } = await service.listReturns(query)
  ok(res, items.map(toPublicOrder), pageMeta(query.page, query.limit, total))
}

export const adminReturnDecision: RequestHandler = async (req, res) => {
  const { params, body } = valid<typeof adminReturnDecisionSchema>(req)
  ok(
    res,
    toPublicOrder(
      await service.decideReturn(uid(req), params.id, body.decision, body.note)
    )
  )
}

export const adminReturnRefund: RequestHandler = async (req, res) => {
  const { params, body } = valid<typeof adminReturnRefundSchema>(req)
  ok(res, toPublicOrder(await service.refundReturn(uid(req), params.id, body.note)))
}
