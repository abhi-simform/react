import type { RequestHandler } from "express"
import { valid } from "../../middleware/validate.js"
import { pageMeta } from "../../utils/pagination.js"
import { ok } from "../../utils/response.js"
import * as service from "./product.service.js"
import type { getProductSchema, listProductsSchema } from "./product.schema.js"

export const list: RequestHandler = async (req, res) => {
  const { query } = valid<typeof listProductsSchema>(req)
  const { items, total } = await service.listProducts(query)
  ok(res, items, pageMeta(query.page, query.limit, total))
}

export const getOne: RequestHandler = async (req, res) => {
  const { params } = valid<typeof getProductSchema>(req)
  ok(res, await service.getProduct(params.idOrSlug))
}
