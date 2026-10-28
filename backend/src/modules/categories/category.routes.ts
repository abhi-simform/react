import { Router } from "express"
import { publicCache } from "../../middleware/httpCache.js"
import { validate } from "../../middleware/validate.js"
import { brands, getOne, tree } from "./category.controller.js"
import { getCategorySchema, listBrandsSchema } from "./category.schema.js"

export const categoryRoutes = Router()
categoryRoutes.get("/", publicCache(300, 3600), tree)
categoryRoutes.get("/:slug", publicCache(300, 3600), validate(getCategorySchema), getOne)

// GET /brands is mounted separately in routes.ts (it is a catalog-level resource).
export const brandRoutes = Router()
brandRoutes.get("/", publicCache(300, 3600), validate(listBrandsSchema), brands)
