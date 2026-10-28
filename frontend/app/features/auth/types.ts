export type Role = "customer" | "seller" | "admin"

export type AuthUser = {
  id: string
  name: string
  email: string
  role: Role
}

/** "loading" = we do not know yet (restoring a session): guards must not redirect on it. */
export type AuthStatus = "loading" | "authenticated" | "anonymous"
