import type { RequestHandler } from "express"
import { Router } from "express"
import { authenticate, optionalAuth } from "../../middleware/auth.js"
import { valid, validate } from "../../middleware/validate.js"
import { noContent, ok } from "../../utils/response.js"
import {
  compareSchema,
  forYouSchema,
  listViewedSchema,
  productRailSchema,
  recordViewsSchema,
  trendingSchema,
} from "./recommendations.schema.js"
import * as service from "./recommendations.service.js"

const uid = (req: Parameters<RequestHandler>[0]) => req.user!.id

/** Mounted at /me/recently-viewed */
export const recentlyViewedRoutes = Router()
recentlyViewedRoutes.use(authenticate)
recentlyViewedRoutes.get("/", validate(listViewedSchema), async (req, res) => {
  const { query } = valid<typeof listViewedSchema>(req)
  ok(res, await service.listViewed(uid(req), query.limit))
})
recentlyViewedRoutes.post("/", validate(recordViewsSchema), async (req, res) => {
  const { body } = valid<typeof recordViewsSchema>(req)
  ok(res, await service.recordViews(uid(req), body.items), undefined, 202)
})
recentlyViewedRoutes.delete("/", async (req, res) => {
  await service.clearViewed(uid(req))
  noContent(res)
})

/** Mounted at /recommendations (public; a Bearer token personalises "for-you") */
export const recommendationRoutes = Router()
recommendationRoutes.get("/trending", validate(trendingSchema), async (req, res) => {
  const { query } = valid<typeof trendingSchema>(req)
  ok(res, await service.trending(query.limit, query.category))
})
recommendationRoutes.get(
  "/for-you",
  optionalAuth,
  validate(forYouSchema),
  async (req, res) => {
    const { query } = valid<typeof forYouSchema>(req)
    const { items, personalised, basedOn } = await service.forYou(
      req.user?.id ?? null,
      query.seed ?? [],
      query.limit
    )
    ok(res, items, { personalised, basedOn })
  }
)

/** Mounted at /products, BEFORE the catalog routes (so /compare is not read as a slug) */
export const productDiscoveryRoutes = Router()
productDiscoveryRoutes.get("/compare", validate(compareSchema), async (req, res) => {
  const { query } = valid<typeof compareSchema>(req)
  ok(res, await service.compareProducts(query.ids))
})
productDiscoveryRoutes.get(
  "/:idOrSlug/similar",
  validate(productRailSchema),
  async (req, res) => {
    const { params, query } = valid<typeof productRailSchema>(req)
    ok(res, await service.similarProducts(params.idOrSlug, query.limit))
  }
)
productDiscoveryRoutes.get(
  "/:idOrSlug/also-bought",
  validate(productRailSchema),
  async (req, res) => {
    const { params, query } = valid<typeof productRailSchema>(req)
    const { items, source } = await service.alsoBought(params.idOrSlug, query.limit)
    ok(res, items, { source })
  }
)
