import { Router, type RequestHandler } from "express"
import type { Types } from "mongoose"
import { authenticate, authorize } from "../../middleware/auth.js"
import { valid, validate } from "../../middleware/validate.js"
import { ApiError } from "../../utils/ApiError.js"
import { ok } from "../../utils/response.js"
import { auditChange } from "../audit/audit.service.js"
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

/** Two live deals on one product must not overlap in time: which price would the shopper get? */
async function assertNoOverlap(
  productId: Types.ObjectId,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string
) {
  const clash = await Deal.findOne({
    product: productId,
    isActive: true,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    startsAt: { $lt: endsAt },
    endsAt: { $gt: startsAt },
  }).lean()
  if (clash)
    throw new ApiError(
      409,
      "DEAL_OVERLAP",
      "This product already has an active deal in that time window",
      [
        {
          in: "body",
          path: "startsAt",
          message: `Overlaps another deal (${clash.startsAt.toISOString()} to ${clash.endsAt.toISOString()})`,
        },
      ]
    )
}

adminDealRoutes.get("/", async (_req, res) => {
  const deals = await Deal.find().sort({ endsAt: -1 }).limit(200).lean()
  const products = await Product.find({ _id: { $in: deals.map((d) => d.product) } })
    .select("name slug price images")
    .lean()
  const byId = new Map(products.map((p) => [String(p._id), p]))
  ok(
    res,
    deals.map((d) => {
      const p = byId.get(String(d.product))
      return {
        ...d,
        productInfo: p
          ? {
              id: String(p._id),
              name: p.name,
              slug: p.slug,
              price: p.price,
              image: p.images?.[0]?.url ?? null,
            }
          : null,
      }
    })
  )
})
adminDealRoutes.post("/", validate(createDealSchema), async (req, res) => {
  const { body } = valid<typeof createDealSchema>(req)
  const product = await Product.findById(body.productId).lean()
  if (!product) throw ApiError.notFound("Product not found")
  if (body.dealPrice >= product.price)
    throw ApiError.badRequest("A deal price must be below the regular price")
  if (body.isActive) await assertNoOverlap(product._id, body.startsAt, body.endsAt)
  const { productId, ...rest } = body
  ok(res, await Deal.create({ product: productId, ...rest }), undefined, 201)
})
adminDealRoutes.patch("/:id", validate(updateDealSchema), async (req, res) => {
  const { params, body } = valid<typeof updateDealSchema>(req)
  const before = await Deal.findById(params.id).lean()
  if (!before) throw ApiError.notFound("Deal not found")
  const next = { ...before, ...body }
  if (next.isActive)
    await assertNoOverlap(before.product, next.startsAt, next.endsAt, params.id)
  const deal = await Deal.findByIdAndUpdate(
    params.id,
    { $set: body },
    { returnDocument: "after" }
  )
  if (!deal) throw ApiError.notFound("Deal not found")
  ok(
    res,
    auditChange(res, before, deal.toObject(), [
      "dealPrice",
      "startsAt",
      "endsAt",
      "stockLimit",
      "isActive",
      "badge",
    ])
  )
})
adminDealRoutes.delete("/:id", validate(dealIdSchema), async (req, res) => {
  const { params } = valid<typeof dealIdSchema>(req)
  await Deal.deleteOne({ _id: params.id })
  res.status(204).end()
})
