import { Router } from "express"
import { authenticate } from "../../middleware/auth.js"
import { authLimiter } from "../../middleware/rateLimit.js"
import { validate } from "../../middleware/validate.js"
import * as c from "./auth.controller.js"
import * as s from "./auth.schema.js"

export const authRoutes = Router()
// Brute-force limiter only on the endpoints an attacker can guess against. Refresh, logout and
// the sessions endpoints are called by a signed-in SPA all day (every tab, every reload) and
// stay under the global limiter, or ordinary use would lock people out of their own session.
const guess = authLimiter

authRoutes.post("/register", guess, validate(s.registerSchema), c.register)
authRoutes.post("/login", guess, validate(s.loginSchema), c.login)
authRoutes.post("/refresh", c.refresh) // uses the httpOnly cookie, no body
authRoutes.post("/logout", c.logout)
authRoutes.post("/verify-email", guess, validate(s.verifyEmailSchema), c.verifyEmail)
authRoutes.post("/resend-verification", authenticate, c.resendVerification)
authRoutes.post(
  "/forgot-password",
  guess,
  validate(s.forgotPasswordSchema),
  c.forgotPassword
)
authRoutes.post(
  "/reset-password",
  guess,
  validate(s.resetPasswordSchema),
  c.resetPassword
)
authRoutes.post(
  "/change-password",
  guess,
  authenticate,
  validate(s.changePasswordSchema),
  c.changePassword
)

// Sessions (B10). The refresh cookie (path /api/v1/auth) tells us which one is "this device".
authRoutes.get("/sessions", authenticate, c.listSessions)
authRoutes.delete(
  "/sessions/:id",
  authenticate,
  validate(s.sessionParamsSchema),
  c.revokeSession
)
authRoutes.post("/logout-all", authenticate, c.logoutAll)

// Google sign-in (B10): browser navigations, not fetch calls. See auth.controller.ts.
authRoutes.get("/google", guess, c.googleStart)
authRoutes.get("/google/mock", c.googleMockConsent)
authRoutes.get("/google/callback", c.googleCallback)
