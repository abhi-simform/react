import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { useAuth } from "@/features/auth"
import { railKeys } from "@/lib/queryKeys"

import { postViews } from "../recommendations.api"
import { useLocalViews } from "./useLocalViews"

/** A visit only counts after the shopper STAYED this long (a bounce is not "viewed"). */
export const VIEW_DWELL_MS = 3000

/**
 * Record "viewed" for a product page, after VIEW_DWELL_MS on it. Signed in: one fire-and-forget
 * POST (the server de-duplicates per product and keeps the newest 30). Guest: the local list.
 * The timer is the effect's cleanup target: leaving the page, or switching to another product
 * (new `productId`), cancels it, and StrictMode's double run still ends with ONE timer, so one
 * request. While auth is still loading nothing is recorded (we would not know where it goes).
 */
export function useTrackView(productId: string) {
  const { status, user } = useAuth()
  const queryClient = useQueryClient()
  const { push } = useLocalViews()
  const userId = user?.id ?? null

  useEffect(() => {
    if (status === "loading") return
    const timer = setTimeout(() => {
      if (userId) {
        postViews([{ productId }])
          .then(() =>
            queryClient.invalidateQueries({
              queryKey: railKeys.recentlyViewed(userId),
            })
          )
          .catch(() => undefined) // analytics-grade: a failed view is not worth an error
      } else {
        push(productId)
      }
    }, VIEW_DWELL_MS)
    return () => clearTimeout(timer)
  }, [productId, status, userId, push, queryClient])
}
