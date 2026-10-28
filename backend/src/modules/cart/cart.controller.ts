import type { RequestHandler } from "express"
import { valid } from "../../middleware/validate.js"
import { ApiError } from "../../utils/ApiError.js"
import { ok } from "../../utils/response.js"
import * as service from "./cart.service.js"
import type { applyCouponSchema } from "../coupons/coupon.schema.js"
import type {
  addItemSchema,
  mergeSchema,
  removeItemSchema,
  updateItemSchema,
} from "./cart.schema.js"

const owner = (req: Parameters<RequestHandler>[0]) => req.cartOwner!

export const get: RequestHandler = async (req, res) => {
  ok(res, await service.getCart(owner(req)))
}

export const addItem: RequestHandler = async (req, res) => {
  const { body } = valid<typeof addItemSchema>(req)
  ok(res, await service.addItem(owner(req), body.productId, body.qty), undefined, 201)
}

export const updateItem: RequestHandler = async (req, res) => {
  const { params, body } = valid<typeof updateItemSchema>(req)
  ok(res, await service.updateItem(owner(req), params.productId, body))
}

export const removeItem: RequestHandler = async (req, res) => {
  const { params } = valid<typeof removeItemSchema>(req)
  ok(res, await service.removeItem(owner(req), params.productId))
}

export const clear: RequestHandler = async (req, res) => {
  ok(res, await service.clearCart(owner(req)))
}

export const acknowledgePrices: RequestHandler = async (req, res) => {
  ok(res, await service.acknowledgePrices(owner(req)))
}

export const merge: RequestHandler = async (req, res) => {
  const { body } = valid<typeof mergeSchema>(req)
  if (!req.user) throw ApiError.unauthorized()
  const { cart, merge: report } = await service.mergeGuestCart(
    req.user.id,
    body.guestToken
  )
  ok(res, { ...cart, merge: report })
}

export const applyCoupon: RequestHandler = async (req, res) => {
  const { body } = valid<typeof applyCouponSchema>(req)
  ok(res, await service.applyCoupon(req.user!.id, body.code))
}

export const removeCoupon: RequestHandler = async (req, res) => {
  ok(res, await service.removeCoupon(req.user!.id))
}
