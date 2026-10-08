import { Router } from "express"
import { authenticate } from "../../middleware/auth.js"
import { validate } from "../../middleware/validate.js"
import { getMe, updateMe } from "./user.controller.js"
import { updateProfileSchema } from "./user.schema.js"

export const userRoutes = Router()
userRoutes.use(authenticate)
userRoutes.get("/me", getMe)
userRoutes.patch("/me", validate(updateProfileSchema), updateMe)
