import { createContext, useContext, useEffect, useMemo, useState } from "react"

import { useLocalStorage } from "@/hooks/useLocalStorage"

import type { AuthStatus, AuthUser, Role } from "./types"

/**
 * STUB (Stage 5.6): a fake user in localStorage, toggled by the dev panel or the
 * login page. Stage 8 moves this into a real context and Stage 10 swaps the
 * source for the API (access token in memory + refresh cookie). The shape
 * `{ status, user, login, logout }` is what the guards depend on, so they will
 * not change.
 */
type AuthValue = {
  status: AuthStatus
  user: AuthUser | null
  login: (role?: Role) => void
  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

const STORAGE_KEY = "shopsphere.devUser"
const RESTORE_DELAY_MS = 300

function isAuthUser(value: unknown): value is AuthUser {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "role" in value &&
    (value.role === "customer" ||
      value.role === "seller" ||
      value.role === "admin") &&
    "name" in value &&
    typeof value.name === "string" &&
    "email" in value &&
    typeof value.email === "string"
  )
}

const fakeUser = (role: Role): AuthUser => ({
  id: `dev-${role}`,
  name: `Dev ${role}`,
  email: `${role}@shopsphere.dev`,
  role,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored, clear] = useLocalStorage<AuthUser | null>(
    STORAGE_KEY,
    null,
    (v): v is AuthUser | null => v === null || isAuthUser(v)
  )
  // The real app asks the API ("who am I?") on every page load, which takes time.
  // The timer simulates that wait so the "loading" status is real and the guards must handle it.
  const [restored, setRestored] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setRestored(true), RESTORE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  const status: AuthStatus = !restored
    ? "loading"
    : stored
      ? "authenticated"
      : "anonymous"

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user: status === "authenticated" ? stored : null,
      login: (role = "customer") => setStored(fakeUser(role)),
      logout: clear,
    }),
    [status, stored, setStored, clear]
  )
  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>")
  return value
}
