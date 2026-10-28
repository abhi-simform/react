import type { RequestHandler } from "express"
import { valid } from "../../middleware/validate.js"
import { pageMeta } from "../../utils/pagination.js"
import { noContent, ok } from "../../utils/response.js"
import * as service from "./wishlist.service.js"
import type {
  addWishlistSchema,
  listWishlistSchema,
  removeWishlistSchema,
} from "./wishlist.schema.js"

export const listIds: RequestHandler = async (req, res) => {
  ok(res, await service.listIds(req.user!.id))
}

export const list: RequestHandler = async (req, res) => {
  const { query } = valid<typeof listWishlistSchema>(req)
  const { items, total } = await service.list(req.user!.id, query.page, query.limit)
  ok(res, items, pageMeta(query.page, query.limit, total))
}

export const add: RequestHandler = async (req, res) => {
  const { body } = valid<typeof addWishlistSchema>(req)
  const result = await service.add(req.user!.id, body.productId)
  ok(res, { productId: result.productId }, undefined, result.created ? 201 : 200)
}

export const remove: RequestHandler = async (req, res) => {
  const { params } = valid<typeof removeWishlistSchema>(req)
  await service.remove(req.user!.id, params.productId)
  noContent(res)
}
