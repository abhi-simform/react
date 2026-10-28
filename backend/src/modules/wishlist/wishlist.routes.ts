import { Router } from "express"
import { authenticate } from "../../middleware/auth.js"
import { validate } from "../../middleware/validate.js"
import { add, list, listIds, remove } from "./wishlist.controller.js"
import {
  addWishlistSchema,
  listWishlistSchema,
  removeWishlistSchema,
} from "./wishlist.schema.js"

export const wishlistRoutes = Router()
wishlistRoutes.use(authenticate)
wishlistRoutes.get("/", validate(listWishlistSchema), list)
wishlistRoutes.get("/ids", listIds)
wishlistRoutes.post("/", validate(addWishlistSchema), add)
wishlistRoutes.delete("/:productId", validate(removeWishlistSchema), remove)
