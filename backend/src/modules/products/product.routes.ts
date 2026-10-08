import { Router } from "express"
import { validate } from "../../middleware/validate.js"
import { getOne, list } from "./product.controller.js"
import { getProductSchema, listProductsSchema } from "./product.schema.js"

export const productRoutes = Router()
productRoutes.get("/", validate(listProductsSchema), list)
productRoutes.get("/:idOrSlug", validate(getProductSchema), getOne)
