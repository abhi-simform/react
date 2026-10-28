import { Router } from "express"
import { valid, validate } from "../../middleware/validate.js"
import { ok } from "../../utils/response.js"
import { checkPincodeSchema } from "./pincode.schema.js"
import { checkPincode } from "./pincode.service.js"

// Public: shoppers check delivery before logging in (PDP "Deliver to" box).
export const pincodeRoutes = Router()
pincodeRoutes.get("/:pincode", validate(checkPincodeSchema), (req, res) => {
  const { params } = valid<typeof checkPincodeSchema>(req)
  ok(res, checkPincode(params.pincode))
})
