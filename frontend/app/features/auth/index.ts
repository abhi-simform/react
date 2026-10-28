// Public API of the auth feature.
export { AuthProvider, useAuth } from "./AuthProvider"
export { getReturnTo, safeRedirect } from "./returnTo"
export { PublicOnly, RequireAuth, RequireRole } from "./components/guards"
export { LoginForm } from "./components/LoginForm"
export { RegisterForm } from "./components/RegisterForm"
export { ForgotPasswordForm } from "./components/ForgotPasswordForm"
export { ResetPasswordForm } from "./components/ResetPasswordForm"
export { VerifyEmailPage } from "./components/VerifyEmailPage"
export { VerifyEmailBanner } from "./components/VerifyEmailBanner"
export { GoogleCallback } from "./components/GoogleCallback"
export { AccountMenu } from "./components/AccountMenu"
export { IdleWarning } from "./components/IdleWarning"
export { SessionCacheSync } from "./SessionCacheSync"
export {
  accessTokenExpiresAt,
  devBreakAccessToken,
  getAccessToken,
} from "./session"
export { broadcastAuth } from "./authChannel"
export type { AuthStatus, AuthUser, Role } from "./types"
export { passwordField } from "./schemas"
