import type { CookieOptions, Request, RequestHandler, Response } from "express"
import { REFRESH_COOKIE, API_PREFIX } from "../../config/constants.js"
import { env } from "../../config/env.js"
import { valid } from "../../middleware/validate.js"
import { ApiError } from "../../utils/ApiError.js"
import { created, noContent, ok } from "../../utils/response.js"
import * as google from "./google.js"
import * as googleService from "./google.service.js"
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

// ---- Google sign-in (B10) ---------------------------------------------------------------
// The browser navigates here (GET), is redirected to Google, comes back to the callback, and
// finally lands on the SPA with the refresh cookie already set: the SPA then does its normal
// silent refresh. Failures redirect to the SPA with `?error=<code>` (never a raw JSON page,
// because a person, not fetch(), is on the other end of these URLs).

const stateCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "lax", // the callback is a top-level GET from Google: Lax cookies are sent, Strict ones are not
  path: `${API_PREFIX}/auth/google`,
  maxAge: 10 * 60 * 1000,
}
const toClient = (query: Record<string, string>) =>
  `${env.CLIENT_URL}/auth/google/callback?${new URLSearchParams(query)}`

export const googleStart: RequestHandler = (req, res) => {
  if (!google.googleEnabled)
    return res.redirect(toClient({ error: "google_not_configured" }))
  const redirect = google.safeRedirect(req.query.redirect)
  const { nonce, cookie } = google.createState(redirect)
  res.cookie(google.STATE_COOKIE, cookie, stateCookieOptions)
  res.redirect(
    google.googleMock
      ? `${API_PREFIX}/auth/google/mock?state=${nonce}`
      : google.authorizationUrl(nonce)
  )
}

export const googleMockConsent: RequestHandler = (req, res) => {
  if (!google.googleMock) throw ApiError.notFound()
  // Browsers also apply form-action to the redirects that follow the submit (callback -> SPA).
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'none'; form-action 'self' ${new URL(env.CLIENT_URL).origin}`
  )
  res.type("html").send(google.mockConsentPage(String(req.query.state ?? "")))
}

export const googleCallback: RequestHandler = async (req, res) => {
  const q = req.query as Record<string, string | undefined>
  const state = google.readState(req.cookies?.[google.STATE_COOKIE], q.state)
  res.clearCookie(google.STATE_COOKIE, { ...stateCookieOptions, maxAge: undefined })
  if (!state) return res.redirect(toClient({ error: "invalid_state" }))
  // The user pressed Cancel at Google (or the mock page).
  if (q.error || q.decision === "deny")
    return res.redirect(toClient({ error: "access_denied", redirect: state.redirect }))
  try {
    const code =
      q.code ??
      (google.googleMock && q.email
        ? google.mockCode({
            sub: `mock-${q.email.toLowerCase()}`,
            email: q.email,
            emailVerified: q.verified === "1",
            name: q.name || q.email,
          })
        : undefined)
    if (!code) return res.redirect(toClient({ error: "google_failed" }))
    const outcome = await googleService.signInWithGoogle(await google.exchangeCode(code))
    const session = await service.issueSession(outcome.user, clientInfo(req))
    setRefreshCookie(res, session.refreshToken)
    res.redirect(
      toClient({
        redirect: state.redirect,
        ...(outcome.created ? { created: "1" } : {}),
        ...(outcome.linked ? { linked: "1" } : {}),
      })
    )
  } catch (err) {
    if (err instanceof ApiError)
      return res.redirect(
        toClient({ error: err.code.toLowerCase(), redirect: state.redirect })
      )
    req.log?.error({ err }, "Google sign-in failed")
    res.redirect(toClient({ error: "google_failed", redirect: state.redirect }))
  }
}
