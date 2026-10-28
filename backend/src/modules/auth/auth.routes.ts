import { Router } from "express"
import { authenticate } from "../../middleware/auth.js"
import { authLimiter } from "../../middleware/rateLimit.js"
import { validate } from "../../middleware/validate.js"
import * as c from "./auth.controller.js"
import * as s from "./auth.schema.js"

export const authRoutes = Router()
authRoutes.use(authLimiter)

authRoutes.post("/register", validate(s.registerSchema), c.register)
authRoutes.post("/login", validate(s.loginSchema), c.login)
authRoutes.post("/refresh", c.refresh) // uses the httpOnly cookie, no body
authRoutes.post("/logout", c.logout)
authRoutes.post("/verify-email", validate(s.verifyEmailSchema), c.verifyEmail)
authRoutes.post("/resend-verification", authenticate, c.resendVerification)
authRoutes.post("/forgot-password", validate(s.forgotPasswordSchema), c.forgotPassword)
authRoutes.post("/reset-password", validate(s.resetPasswordSchema), c.resetPassword)
authRoutes.post(
  "/change-password",
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
