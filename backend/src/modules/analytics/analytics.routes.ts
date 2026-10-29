import { Router } from "express"
import { authenticate, authorize } from "../../middleware/auth.js"
import { valid, validate } from "../../middleware/validate.js"
import { ok } from "../../utils/response.js"
import * as S from "./analytics.schema.js"
import * as service from "./analytics.service.js"

/**
 * Mounted twice by routes.ts, like the catalog: `/admin/analytics` (the whole platform) and
 * `/seller/analytics` (the caller's own products only: same handlers, scope = their id).
 * The funnel is platform-wide only.
 */
export function analyticsRoutes(scope: "all" | "own") {
  const r = Router()
  const scopeOf = (req: { user?: { id: string } }): service.Scope =>
    scope === "own" ? { sellerId: req.user!.id } : {}

  r.get("/overview", validate(S.overviewSchema), async (req, res) => {
    const { query } = valid<typeof S.overviewSchema>(req)
    ok(res, await service.overview(service.resolveRange(query), scopeOf(req)))
  })
  r.get("/revenue", validate(S.revenueSchema), async (req, res) => {
    const { query } = valid<typeof S.revenueSchema>(req)
    ok(res, await service.revenueSeries(service.resolveRange(query), scopeOf(req)))
  })
  r.get("/orders-by-status", validate(S.statusSchema), async (req, res) => {
    const { query } = valid<typeof S.statusSchema>(req)
    ok(res, await service.ordersByStatus(service.resolveRange(query), scopeOf(req)))
  })
  r.get("/top-products", validate(S.topProductsSchema), async (req, res) => {
    const { query } = valid<typeof S.topProductsSchema>(req)
    ok(
      res,
      await service.topProducts(service.resolveRange(query), scopeOf(req), {
        limit: query.limit,
        by: query.by,
      })
    )
  })
  r.get("/category-share", validate(S.categoryShareSchema), async (req, res) => {
    const { query } = valid<typeof S.categoryShareSchema>(req)
    ok(res, await service.categoryShare(service.resolveRange(query), scopeOf(req)))
  })
  r.get("/low-stock", validate(S.lowStockSchema), async (req, res) => {
    const { query } = valid<typeof S.lowStockSchema>(req)
    ok(res, await service.lowStock(scopeOf(req), query))
  })
  if (scope === "all")
    r.get("/funnel", validate(S.funnelSchema), async (req, res) => {
      const { query } = valid<typeof S.funnelSchema>(req)
      ok(res, await service.funnel(service.resolveRange(query)))
    })
  return r
}

/** GET /me/spending?months=6: the signed-in shopper's own spending per month (the account page chart). */
export const spendingRoutes = Router()
spendingRoutes.use(authenticate)
spendingRoutes.get("/", validate(S.spendingSchema), async (req, res) => {
  const { query } = valid<typeof S.spendingSchema>(req)
  ok(res, await service.mySpending(req.user!.id, query.months))
})

export const adminAnalyticsRoutes = Router()
adminAnalyticsRoutes.use(authenticate, authorize("admin"), analyticsRoutes("all"))
