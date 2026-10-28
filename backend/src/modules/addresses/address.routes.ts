import { Router } from "express"
import { authenticate } from "../../middleware/auth.js"
import { validate } from "../../middleware/validate.js"
import { create, list, remove, setDefault, update } from "./address.controller.js"
import {
  addressIdSchema,
  createAddressSchema,
  updateAddressSchema,
} from "./address.schema.js"

export const addressRoutes = Router()
addressRoutes.use(authenticate)
addressRoutes.get("/", list)
addressRoutes.post("/", validate(createAddressSchema), create)
addressRoutes.patch("/:id", validate(updateAddressSchema), update)
addressRoutes.post("/:id/default", validate(addressIdSchema), setDefault)
addressRoutes.delete("/:id", validate(addressIdSchema), remove)
