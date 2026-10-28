import type { RequestHandler } from "express"
import { valid } from "../../middleware/validate.js"
import { pageMeta } from "../../utils/pagination.js"
import { ok } from "../../utils/response.js"
import { setProductPrice } from "./price.service.js"
import * as service from "./product.service.js"
import type {
  getProductSchema,
  listProductsSchema,
  setPriceSchema,
} from "./product.schema.js"

export const list: RequestHandler = async (req, res) => {
  const { query } = valid<typeof listProductsSchema>(req)
  const { items, total, facets } = await service.listProducts(query)
  ok(res, items, {
    ...pageMeta(query.page, query.limit, total),
    ...(facets ? { facets } : {}),
  })
}

export const getOne: RequestHandler = async (req, res) => {
  const { params } = valid<typeof getProductSchema>(req)
  ok(res, await service.getProduct(params.idOrSlug))
}

export const setPrice: RequestHandler = async (req, res) => {
  const { params, body } = valid<typeof setPriceSchema>(req)
  const { product, from, to, alerted } = await setProductPrice(params.id, body.price)
  ok(res, {
    id: String(product._id),
    name: product.name,
    from,
    to,
    wishlistAlertQueued: alerted,
  })
}
