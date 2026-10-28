import type { RequestHandler } from "express"
import { valid } from "../../middleware/validate.js"
import { created, ok } from "../../utils/response.js"
import * as service from "./address.service.js"
import type {
  addressIdSchema,
  createAddressSchema,
  updateAddressSchema,
} from "./address.schema.js"

export const list: RequestHandler = async (req, res) => {
  ok(res, await service.list(req.user!.id))
}
export const create: RequestHandler = async (req, res) => {
  const { body } = valid<typeof createAddressSchema>(req)
  created(res, await service.create(req.user!.id, body))
}
export const update: RequestHandler = async (req, res) => {
  const { params, body } = valid<typeof updateAddressSchema>(req)
  ok(res, await service.update(req.user!.id, params.id, body))
}
export const setDefault: RequestHandler = async (req, res) => {
  const { params } = valid<typeof addressIdSchema>(req)
  ok(res, await service.setDefault(req.user!.id, params.id))
}
export const remove: RequestHandler = async (req, res) => {
  const { params } = valid<typeof addressIdSchema>(req)
  ok(res, await service.remove(req.user!.id, params.id))
}
