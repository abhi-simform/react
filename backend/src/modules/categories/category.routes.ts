import { Router } from "express"
import { publicCache } from "../../middleware/httpCache.js"
import { authenticate, authorize } from "../../middleware/auth.js"
import { valid, validate } from "../../middleware/validate.js"
import { created, noContent, ok } from "../../utils/response.js"
import * as admin from "./category.admin.service.js"
import {
  createBrandSchema,
  createCategorySchema,
  deleteBrandSchema,
  deleteCategorySchema,
  listAdminBrandsSchema,
  reorderCategoriesSchema,
  updateBrandSchema,
  updateCategorySchema,
} from "./category.admin.schema.js"
import { brands, getOne, tree } from "./category.controller.js"
import { getCategorySchema, listBrandsSchema } from "./category.schema.js"

export const categoryRoutes = Router()
categoryRoutes.get("/", publicCache(300, 3600), tree)
categoryRoutes.get("/:slug", publicCache(300, 3600), validate(getCategorySchema), getOne)

// GET /brands is mounted separately in routes.ts (it is a catalog-level resource).
export const brandRoutes = Router()
brandRoutes.get("/", publicCache(300, 3600), validate(listBrandsSchema), brands)

// ---- Staff CRUD (B1, admin). Audited by the /admin mount in routes.ts. ----
export const adminCategoryRoutes = Router()
adminCategoryRoutes.use(authenticate, authorize("admin"))
adminCategoryRoutes.get("/", async (_req, res) => ok(res, await admin.listCategories()))
adminCategoryRoutes.post("/", validate(createCategorySchema), async (req, res) => {
  const { body } = valid<typeof createCategorySchema>(req)
  created(res, await admin.createCategory(body))
})
// Registered before "/:id" so "reorder" is not read as an id.
adminCategoryRoutes.put(
  "/reorder",
  validate(reorderCategoriesSchema),
  async (req, res) => {
    const { body } = valid<typeof reorderCategoriesSchema>(req)
    ok(res, await admin.reorderCategories(body.parentId, body.ids))
  }
)
adminCategoryRoutes.patch("/:id", validate(updateCategorySchema), async (req, res) => {
  const { params, body } = valid<typeof updateCategorySchema>(req)
  ok(res, await admin.updateCategory(params.id, body))
})
adminCategoryRoutes.delete("/:id", validate(deleteCategorySchema), async (req, res) => {
  const { params } = valid<typeof deleteCategorySchema>(req)
  await admin.deleteCategory(params.id)
  noContent(res)
})

export const adminBrandRoutes = Router()
adminBrandRoutes.use(authenticate, authorize("admin"))
adminBrandRoutes.get("/", validate(listAdminBrandsSchema), async (req, res) => {
  const { query } = valid<typeof listAdminBrandsSchema>(req)
  ok(res, await admin.listAdminBrands(query.search))
})
adminBrandRoutes.post("/", validate(createBrandSchema), async (req, res) => {
  const { body } = valid<typeof createBrandSchema>(req)
  created(res, await admin.createBrand(body))
})
adminBrandRoutes.patch("/:id", validate(updateBrandSchema), async (req, res) => {
  const { params, body } = valid<typeof updateBrandSchema>(req)
  ok(res, await admin.updateBrand(params.id, body))
})
adminBrandRoutes.delete("/:id", validate(deleteBrandSchema), async (req, res) => {
  const { params } = valid<typeof deleteBrandSchema>(req)
  await admin.deleteBrand(params.id)
  noContent(res)
})
