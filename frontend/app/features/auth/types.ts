export type Role = "customer" | "seller" | "admin"

export type AuthUser = {
  id: string
  name: string
  email: string
  role: Role
  emailVerified: boolean
  /** How this account can sign in: a password, Google, or both (account linking). */
  providers: ("password" | "google")[]
  avatarUrl: string | null
}

/** "loading" = we do not know yet (restoring a session): guards must not redirect on it. */
export type AuthStatus = "loading" | "authenticated" | "anonymous"
