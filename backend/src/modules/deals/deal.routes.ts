import { Router, type RequestHandler } from "express"
import { authenticate, authorize } from "../../middleware/auth.js"
import { valid, validate } from "../../middleware/validate.js"
import { ApiError } from "../../utils/ApiError.js"
import { ok } from "../../utils/response.js"
import { Product } from "../products/product.model.js"
import { Deal } from "./deal.model.js"
import { listDeals } from "./deal.service.js"
import {
  createDealSchema,
  dealIdSchema,
  listDealsSchema,
  updateDealSchema,
} from "./deal.schema.js"

// Public: GET /deals. `meta.now` is the server clock at response time (countdowns use it).
export const dealRoutes = Router()
const list: RequestHandler = async (req, res) => {
  const { query } = valid<typeof listDealsSchema>(req)
  const now = new Date()
  const items = await listDeals({ ...query, now })
  ok(res, items, { now: now.toISOString(), count: items.length })
}
dealRoutes.get("/", validate(listDealsSchema), list)

// Admin: /admin/deals
export const adminDealRoutes = Router()
adminDealRoutes.use(authenticate, authorize("admin"))
adminDealRoutes.get("/", async (_req, res) => {
  ok(res, await Deal.find().sort({ endsAt: -1 }).limit(200).lean())
})
adminDealRoutes.post("/", validate(createDealSchema), async (req, res) => {
  const { body } = valid<typeof createDealSchema>(req)
  const product = await Product.findById(body.productId).lean()
  if (!product) throw ApiError.notFound("Product not found")
  if (body.dealPrice >= product.price)
    throw ApiError.badRequest("A deal price must be below the regular price")
  const { productId, ...rest } = body
  ok(res, await Deal.create({ product: productId, ...rest }), undefined, 201)
})
adminDealRoutes.patch("/:id", validate(updateDealSchema), async (req, res) => {
  const { params, body } = valid<typeof updateDealSchema>(req)
  const deal = await Deal.findByIdAndUpdate(
    params.id,
    { $set: body },
    { returnDocument: "after" }
  )
  if (!deal) throw ApiError.notFound("Deal not found")
  ok(res, deal)
})
adminDealRoutes.delete("/:id", validate(dealIdSchema), async (req, res) => {
  const { params } = valid<typeof dealIdSchema>(req)
  await Deal.deleteOne({ _id: params.id })
  res.status(204).end()
})
