import { useRouter } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { logout } from "./session"

/** Sign out, DROP every cached query (no data of this account survives into the next one), go to /login. */
export function useSignOut() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return async () => {
    await logout().catch(() => undefined) // the local session is cleared either way
    queryClient.clear()
    await router.invalidate()
    await router.navigate({ to: "/login" })
  }
}
