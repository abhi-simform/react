import { z } from "zod"
import { ROLES } from "../../config/constants.js"

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")
const bool = z.enum(["true", "false"]).transform((v) => v === "true")
const idParams = z.object({ id: objectId })

export const listUsersSchema = {
  query: z.object({
    search: z.string().trim().min(1).max(100).optional(), // name or email
    role: z.enum(ROLES).optional(),
    isActive: bool.optional(),
    sort: z.enum(["createdAt", "name", "email", "lastLoginAt"]).default("createdAt"),
    order: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
}
export const userIdSchema = { params: idParams }
export const changeRoleSchema = {
  params: idParams,
  body: z.object({ role: z.enum(ROLES) }),
}
export const changeStatusSchema = {
  params: idParams,
  body: z.object({ isActive: z.boolean() }),
}
