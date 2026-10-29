import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

import {
  addressKeys,
  cartKeys,
  notificationKeys,
  orderKeys,
  profileKeys,
  railKeys,
  wishlistKeys,
} from "@/lib/queryKeys"

import { setReportUser } from "@/lib/observability"

import { useAuth } from "./AuthProvider"

/** Query families that belong to ONE signed-in user: they must never outlive the session. */
const USER_SCOPED = [
  addressKeys.all,
  wishlistKeys.all,
  orderKeys.all,
  profileKeys.all,
  notificationKeys.all,
  cartKeys.all,
  railKeys.all,
] as const

/**
 * Renders nothing. When the signed-in user CHANGES (sign out, sign in as someone else), the
 * previous user's cached data is reset (emptied, and re-fetched by whatever is still mounted), so it can never flash on the next account's screen.
 * (`useFetch` got this for free by putting the user id in its deps; with a shared cache it has
 * to be said explicitly. Putting the user id in every key is the alternative.)
 * `undefined` -> a user (the first restore after a reload) is NOT a change: nothing is cached yet.
 */
export function SessionCacheSync() {
  const { status, user } = useAuth()
  const queryClient = useQueryClient()
  const userId = status === "loading" ? undefined : (user?.id ?? null)
  const previous = useRef<string | null | undefined>(undefined)

  // 14.6: error reports carry the user's ID and nothing else (no e-mail, no name).
  useEffect(() => {
    if (userId !== undefined) setReportUser(userId)
  }, [userId])

  useEffect(() => {
    if (userId === undefined) return
    if (previous.current !== undefined && previous.current !== userId) {
      for (const key of USER_SCOPED)
        void queryClient.resetQueries({ queryKey: key })
    }
    previous.current = userId
  }, [userId, queryClient])

  return null
}
