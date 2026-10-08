import type { RequestHandler } from "express"
import { ApiError } from "../../utils/ApiError.js"
import { ok } from "../../utils/response.js"
import { valid } from "../../middleware/validate.js"
import { User, toPublicUser } from "./user.model.js"
import { updateProfileSchema } from "./user.schema.js"

export const getMe: RequestHandler = async (req, res) => {
  const user = await User.findById(req.user!.id)
  if (!user) throw ApiError.notFound("User not found")
  ok(res, toPublicUser(user))
}

export const updateMe: RequestHandler = async (req, res) => {
  const { body } = valid<typeof updateProfileSchema>(req)
  const user = await User.findByIdAndUpdate(req.user!.id, body, {
    new: true,
    runValidators: true,
  })
  if (!user) throw ApiError.notFound("User not found")
  ok(res, toPublicUser(user))
}
