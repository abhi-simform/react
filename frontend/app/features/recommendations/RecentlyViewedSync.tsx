import { useEffect, useRef } from "react"

import { useAuth } from "@/features/auth"
import { queryClient } from "@/lib/query-client"
import { railKeys } from "@/lib/queryKeys"

import { useLocalViews } from "./hooks/useLocalViews"
import { postViews } from "./recommendations.api"

/**
 * Login side effect (10.8 skipped it, 11.7 adds it): when a user is signed in and a GUEST list
 * exists in localStorage, send it to the server (`POST /me/recently-viewed`, which merges by
 * product and only moves `viewedAt` forward, so the union is de-duplicated), then empty the
 * local list. The local list is cleared only AFTER the server accepted it: a failed request
 * leaves it for the next attempt. Timestamps are synthesised from the order (newest first, 1 s
 * apart) because the guest list stores ids only. Renders nothing.
 */
export function RecentlyViewedSync() {
  const { status, user } = useAuth()
  const { ids, clear } = useLocalViews()
  const running = useRef(false)
  const userId = status === "authenticated" ? (user?.id ?? null) : null

  useEffect(() => {
    if (!userId || ids.length === 0 || running.current) return
    running.current = true
    const now = Date.now()
    postViews(
      ids.map((productId, i) => ({
        productId,
        viewedAt: new Date(now - (i + 1) * 1000).toISOString(),
      }))
    )
      .then(() => {
        clear()
        return queryClient.invalidateQueries({ queryKey: railKeys.all })
      })
      .catch(() => undefined) // stays in localStorage; retried on the next sign-in/mount
      .finally(() => {
        running.current = false
      })
  }, [userId, ids, clear])

  return null
}
