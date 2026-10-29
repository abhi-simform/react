import { Router } from "express"
import { authenticate, authorize } from "../../middleware/auth.js"
import { publicCache } from "../../middleware/httpCache.js"
import { validate } from "../../middleware/validate.js"
import { staffProductRoutes } from "./product.admin.routes.js"
import { getOne, list, setPrice } from "./product.controller.js"
import { getProductSchema, listProductsSchema, setPriceSchema } from "./product.schema.js"

export const productRoutes = Router()
// Same for every visitor, so browsers/CDNs may reuse it briefly (stock/deal changes show up within
// seconds; checkout always re-prices on the server regardless).
productRoutes.get("/", publicCache(10, 60), validate(listProductsSchema), list)
productRoutes.get("/:idOrSlug", publicCache(10, 60), validate(getProductSchema), getOne)

// Staff: change a price (a drop alerts wishlisters through a background job). Audited.
export const adminProductRoutes = Router()
adminProductRoutes.use(authenticate, authorize("admin"))
adminProductRoutes.patch("/:id/price", validate(setPriceSchema), setPrice)
adminProductRoutes.use(staffProductRoutes("all"))
