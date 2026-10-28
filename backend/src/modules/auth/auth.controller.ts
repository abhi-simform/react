import type { CookieOptions, Request, RequestHandler, Response } from "express"
import { REFRESH_COOKIE, API_PREFIX } from "../../config/constants.js"
import { env } from "../../config/env.js"
import { valid } from "../../middleware/validate.js"
import { created, noContent, ok } from "../../utils/response.js"
import * as service from "./auth.service.js"
import type {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  sessionParamsSchema,
  verifyEmailSchema,
} from "./auth.schema.js"

// The refresh token lives ONLY in an httpOnly cookie (JS can't read it => XSS can't steal it),
// scoped to /auth so it isn't sent with every API call.
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAMESITE,
  path: `${API_PREFIX}/auth`,
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
}
export const setRefreshCookie = (res: Response, token: string) =>
  res.cookie(REFRESH_COOKIE, token, cookieOptions)
const clearRefreshCookie = (res: Response) =>
  res.clearCookie(REFRESH_COOKIE, { ...cookieOptions, maxAge: undefined })
export const clientInfo = (req: Request) => ({
  userAgent: req.get("user-agent"),
  ip: req.ip,
})

// Access token goes in the JSON body; the frontend keeps it IN MEMORY (not localStorage).
const sessionResponse = (
  res: Response,
  s: { user: unknown; accessToken: string; refreshToken: string },
  status = 200
) => {
  setRefreshCookie(res, s.refreshToken)
  return status === 201
    ? created(res, { user: s.user, accessToken: s.accessToken })
    : ok(res, { user: s.user, accessToken: s.accessToken })
}

export const register: RequestHandler = async (req, res) => {
  const { body } = valid<typeof registerSchema>(req)
  sessionResponse(res, await service.register(body, clientInfo(req)), 201)
}

export const login: RequestHandler = async (req, res) => {
  const { body } = valid<typeof loginSchema>(req)
  sessionResponse(res, await service.login(body, clientInfo(req)))
}

export const refresh: RequestHandler = async (req, res) => {
  try {
    sessionResponse(
      res,
      await service.refresh(req.cookies?.[REFRESH_COOKIE], clientInfo(req))
    )
  } catch (err) {
    clearRefreshCookie(res)
    throw err
  }
}

export const logout: RequestHandler = async (req, res) => {
  await service.logout(req.cookies?.[REFRESH_COOKIE])
  clearRefreshCookie(res)
  noContent(res)
}

export const verifyEmail: RequestHandler = async (req, res) => {
  const { body } = valid<typeof verifyEmailSchema>(req)
  const { alreadyVerified } = await service.verifyEmail(body.token)
  ok(res, {
    message: alreadyVerified ? "Email was already verified" : "Email verified",
    alreadyVerified,
  })
}

export const resendVerification: RequestHandler = async (req, res) => {
  await service.resendVerification(req.user!.id)
  ok(res, { message: "Verification email sent" })
}

export const forgotPassword: RequestHandler = async (req, res) => {
  const { body } = valid<typeof forgotPasswordSchema>(req)
  await service.forgotPassword(body.email)
  ok(res, { message: "If that email is registered, a reset link has been sent" })
}

export const resetPassword: RequestHandler = async (req, res) => {
  const { body } = valid<typeof resetPasswordSchema>(req)
  await service.resetPassword(body.token, body.password)
  clearRefreshCookie(res)
  ok(res, { message: "Password updated. Please sign in." })
}

export const changePassword: RequestHandler = async (req, res) => {
  const { body } = valid<typeof changePasswordSchema>(req)
  await service.changePassword(
    req.user!.id,
    body.currentPassword,
    body.newPassword,
    req.cookies?.[REFRESH_COOKIE]
  )
  // This session stays signed in; every other device is signed out.
  ok(res, { message: "Password changed. Other devices were signed out." })
}

export const listSessions: RequestHandler = async (req, res) => {
  ok(res, await service.listSessions(req.user!.id, req.cookies?.[REFRESH_COOKIE]))
}

export const revokeSession: RequestHandler = async (req, res) => {
  const { params } = valid<typeof sessionParamsSchema>(req)
  const { current } = await service.revokeSession(
    req.user!.id,
    params.id,
    req.cookies?.[REFRESH_COOKIE]
  )
  if (current) clearRefreshCookie(res)
  noContent(res)
}

export const logoutAll: RequestHandler = async (req, res) => {
  await service.logoutAll(req.user!.id)
  clearRefreshCookie(res)
  noContent(res)
}
