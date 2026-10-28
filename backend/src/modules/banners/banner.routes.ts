import { Router } from "express"
import { z } from "zod"
import { authenticate, authorize } from "../../middleware/auth.js"
import { valid, validate } from "../../middleware/validate.js"
import { ApiError } from "../../utils/ApiError.js"
import { ok } from "../../utils/response.js"
import { BANNER_PLACEMENTS, Banner } from "./banner.model.js"

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")
// Links stay on our own site: "/deals" yes, "//evil.com" and "https://..." no.
const sitePath = z
  .string()
  .regex(/^\/(?![/\\])[^\s]*$/, "Use a same-site path like /deals")

export const listBannersSchema = {
  query: z.object({ placement: z.enum(BANNER_PLACEMENTS).default("hero") }),
}
const bannerBody = z.object({
  title: z.string().trim().min(1).max(100),
  subtitle: z.string().trim().max(200).optional(),
  imageUrl: z.url(),
  linkUrl: sitePath,
  placement: z.enum(BANNER_PLACEMENTS).default("hero"),
  sortOrder: z.number().int().default(0),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
})
export const createBannerSchema = { body: bannerBody }
export const updateBannerSchema = {
  params: z.object({ id: objectId }),
  body: bannerBody.partial(),
}

export const bannerRoutes = Router()
bannerRoutes.get("/", validate(listBannersSchema), async (req, res) => {
  const { query } = valid<typeof listBannersSchema>(req)
  const now = new Date()
  const items = await Banner.find({
    placement: query.placement,
    isActive: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] },
    ],
  })
    .sort({ sortOrder: 1, _id: 1 })
    .lean()
  ok(
    res,
    items.map(({ _id, title, subtitle, imageUrl, linkUrl, placement }) => ({
      id: String(_id),
      title,
      subtitle: subtitle ?? null,
      imageUrl,
      linkUrl,
      placement,
    }))
  )
})

export const adminBannerRoutes = Router()
adminBannerRoutes.use(authenticate, authorize("admin"))
adminBannerRoutes.get("/", async (_req, res) => {
  ok(res, await Banner.find().sort({ placement: 1, sortOrder: 1 }).lean())
})
adminBannerRoutes.post("/", validate(createBannerSchema), async (req, res) => {
  const { body } = valid<typeof createBannerSchema>(req)
  ok(res, await Banner.create(body), undefined, 201)
})
adminBannerRoutes.patch("/:id", validate(updateBannerSchema), async (req, res) => {
  const { params, body } = valid<typeof updateBannerSchema>(req)
  const b = await Banner.findByIdAndUpdate(
    params.id,
    { $set: body },
    { returnDocument: "after" }
  )
  if (!b) throw ApiError.notFound("Banner not found")
  ok(res, b)
})
adminBannerRoutes.delete("/:id", async (req, res) => {
  await Banner.deleteOne({ _id: String(req.params.id) })
  res.status(204).end()
})
