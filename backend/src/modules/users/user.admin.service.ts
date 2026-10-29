import type { z } from "zod"
import { ApiError } from "../../utils/ApiError.js"
import { RefreshToken } from "../auth/refreshToken.model.js"
import { User, type UserDoc } from "./user.model.js"
import type { listUsersSchema } from "./user.admin.schema.js"
import type { Role } from "../../config/constants.js"

type ListQuery = z.output<typeof listUsersSchema.query>

export const toAdminUser = (u: UserDoc) => ({
  id: u.id as string,
  name: u.name,
  email: u.email,
  role: u.role,
  phone: u.phone ?? null,
  emailVerified: u.emailVerified,
  isActive: u.isActive,
  providers: u.authProviders,
  lastLoginAt: u.lastLoginAt ?? null,
  createdAt: u.createdAt,
})

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export async function listUsers(q: ListQuery) {
  const filter: Record<string, unknown> = {}
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), "i")
    filter.$or = [{ name: rx }, { email: rx }]
  }
  if (q.role) filter.role = q.role
  if (q.isActive !== undefined) filter.isActive = q.isActive
  const [rows, total] = await Promise.all([
    User.find(filter)
      .sort({ [q.sort]: q.order === "asc" ? 1 : -1, _id: 1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    User.countDocuments(filter),
  ])
  return { items: rows.map(toAdminUser), total }
}

async function find(id: string) {
  const user = await User.findById(id)
  if (!user) throw ApiError.notFound("User not found")
  return user
}

export async function getUser(id: string) {
  return toAdminUser(await find(id))
}

// Sign the user out everywhere: their refresh tokens stop working. (An access token already issued
// keeps working until it expires, JWT_ACCESS_EXPIRES_IN; that is the cost of stateless access tokens.)
const signOut = (userId: string) =>
  RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() })

export async function changeRole(actorId: string, id: string, role: Role) {
  if (actorId === id)
    throw ApiError.conflict("You cannot change your own role", "SELF_MODIFICATION")
  const user = await find(id)
  if (user.role !== role) {
    user.role = role
    await user.save()
    await signOut(id) // the next login carries the new role
  }
  return toAdminUser(user)
}

export async function setActive(actorId: string, id: string, isActive: boolean) {
  if (actorId === id)
    throw ApiError.conflict("You cannot deactivate your own account", "SELF_MODIFICATION")
  const user = await find(id)
  if (user.isActive !== isActive) {
    user.isActive = isActive
    await user.save()
    if (!isActive) await signOut(id)
  }
  return toAdminUser(user)
}
