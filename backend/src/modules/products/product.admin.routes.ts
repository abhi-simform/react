import { Router, type Request } from "express"
import { valid, validate } from "../../middleware/validate.js"
import { pageMeta } from "../../utils/pagination.js"
import { created, ok } from "../../utils/response.js"
import * as service from "./product.admin.service.js"
import {
  bulkProductsSchema,
  createProductSchema,
  exportProductsSchema,
  listAdminProductsSchema,
  productIdSchema,
  updateProductSchema,
} from "./product.admin.schema.js"

const actorOf = (req: Request, scope: service.Actor["scope"]): service.Actor => ({
  id: req.user!.id,
  role: req.user!.role,
  scope,
})

/**
 * The catalog write API. Mounted twice by routes.ts: `/admin/products` (admin, every product) and
 * `/seller/products` (seller or admin, ONLY the caller's own products: the filter is in the
 * service, so a seller asking for another seller's product gets a 404, same as a missing id).
 */
export function staffProductRoutes(scope: service.Actor["scope"]) {
  const r = Router()
  r.get("/", validate(listAdminProductsSchema), async (req, res) => {
    const { query } = valid<typeof listAdminProductsSchema>(req)
    const { items, total } = await service.listProducts(actorOf(req, scope), query)
    ok(res, items, pageMeta(query.page, query.limit, total))
  })
  r.get("/export.csv", validate(exportProductsSchema), async (req, res) => {
    const { query } = valid<typeof exportProductsSchema>(req)
    res
      .type("text/csv")
      .set("Content-Disposition", 'attachment; filename="products.csv"')
      .send(await service.exportProductsCsv(actorOf(req, scope), query))
  })
  r.post("/", validate(createProductSchema), async (req, res) => {
    const { body } = valid<typeof createProductSchema>(req)
    created(res, await service.createProduct(actorOf(req, scope), body))
  })
  r.post("/bulk", validate(bulkProductsSchema), async (req, res) => {
    const { body } = valid<typeof bulkProductsSchema>(req)
    ok(res, await service.bulkSetStatus(actorOf(req, scope), body.ids, body.status))
  })
  r.get("/:id", validate(productIdSchema), async (req, res) => {
    const { params } = valid<typeof productIdSchema>(req)
    ok(res, await service.getProduct(actorOf(req, scope), params.id))
  })
  r.patch("/:id", validate(updateProductSchema), async (req, res) => {
    const { params, body } = valid<typeof updateProductSchema>(req)
    ok(res, await service.updateProduct(actorOf(req, scope), params.id, body))
  })
  r.delete("/:id", validate(productIdSchema), async (req, res) => {
    const { params } = valid<typeof productIdSchema>(req)
    ok(res, await service.archiveProduct(actorOf(req, scope), params.id))
  })
  return r
}
