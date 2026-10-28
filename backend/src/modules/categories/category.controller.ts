import type { RequestHandler } from "express"
import { valid } from "../../middleware/validate.js"
import { ok } from "../../utils/response.js"
import * as service from "./category.service.js"
import type { getCategorySchema, listBrandsSchema } from "./category.schema.js"

export const tree: RequestHandler = async (_req, res) => {
  ok(res, await service.getCategoryTree())
}

export const getOne: RequestHandler = async (req, res) => {
  const { params } = valid<typeof getCategorySchema>(req)
  ok(res, await service.getCategoryBySlug(params.slug))
}

export const brands: RequestHandler = async (req, res) => {
  const { query } = valid<typeof listBrandsSchema>(req)
  ok(res, await service.listBrands(query.category))
}
