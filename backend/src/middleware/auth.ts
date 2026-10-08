import type { RequestHandler } from "express"
import jwt from "jsonwebtoken"
import type { Role } from "../config/constants.js"
import { env } from "../config/env.js"
import { ApiError } from "../utils/ApiError.js"

export interface AccessPayload {
  sub: string
  role: Role
}

export const signAccessToken = (payload: AccessPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  })

function readBearer(header?: string) {
  const [scheme, token] = header?.split(" ") ?? []
  return scheme === "Bearer" && token ? token : null
}

/** Require a valid `Authorization: Bearer <accessToken>`. Sets req.user. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const token = readBearer(req.headers.authorization)
  if (!token) return next(ApiError.unauthorized())
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload
    req.user = { id: payload.sub, role: payload.role }
    next()
  } catch (err) {
    // Distinct code lets the frontend know to call /auth/refresh and retry.
    const expired = err instanceof jwt.TokenExpiredError
    next(
      ApiError.unauthorized(
        expired ? "Access token expired" : "Invalid token",
        expired ? "TOKEN_EXPIRED" : "INVALID_TOKEN"
      )
    )
  }
}

/** Like authenticate but anonymous requests pass through (e.g. guest-friendly endpoints). */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = readBearer(req.headers.authorization)
  if (token) {
    try {
      const p = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload
      req.user = { id: p.sub, role: p.role }
    } catch {
      /* ignore invalid token for optional auth */
    }
  }
  next()
}

/** Role gate — use AFTER authenticate: router.use(authenticate, authorize("admin")) */
export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized())
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden())
    next()
  }
