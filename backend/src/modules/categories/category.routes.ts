import { Router } from "express"
import { validate } from "../../middleware/validate.js"
import { brands, getOne, tree } from "./category.controller.js"
import { getCategorySchema, listBrandsSchema } from "./category.schema.js"

export const categoryRoutes = Router()
categoryRoutes.get("/", tree)
categoryRoutes.get("/:slug", validate(getCategorySchema), getOne)

// GET /brands is mounted separately in routes.ts (it is a catalog-level resource).
export const brandRoutes = Router()
brandRoutes.get("/", validate(listBrandsSchema), brands)
