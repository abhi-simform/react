import { Router } from "express"
import { authenticate } from "../../middleware/auth.js"
import { validate } from "../../middleware/validate.js"
import { applyCouponSchema } from "../coupons/coupon.schema.js"
import { cartOwner } from "./cart.identity.js"
import {
  acknowledgePrices,
  addItem,
  applyCoupon,
  removeCoupon,
  clear,
  get,
  merge,
  removeItem,
  updateItem,
} from "./cart.controller.js"
import {
  addItemSchema,
  mergeSchema,
  removeItemSchema,
  updateItemSchema,
} from "./cart.schema.js"

export const cartRoutes = Router()

// Merge is the one cart route that needs a real login (it moves guest data INTO a user cart).
cartRoutes.post("/merge", authenticate, validate(mergeSchema), merge)

// Coupons are tied to a person (usage limits, first-order rules): a real login is required.
cartRoutes.post("/coupon", authenticate, validate(applyCouponSchema), applyCoupon)
cartRoutes.delete("/coupon", authenticate, removeCoupon)

// Everything else works for a user (Bearer) or a guest (x-cart-token).
cartRoutes.use(cartOwner)
cartRoutes.get("/", get)
cartRoutes.delete("/", clear)
cartRoutes.post("/items", validate(addItemSchema), addItem)
cartRoutes.patch("/items/:productId", validate(updateItemSchema), updateItem)
cartRoutes.delete("/items/:productId", validate(removeItemSchema), removeItem)
cartRoutes.post("/acknowledge-prices", acknowledgePrices)
