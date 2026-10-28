import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { toast } from "sonner"

import { useAuth } from "@/features/auth"
import { wishlistKeys } from "@/lib/queryKeys"

import { addToWishlist } from "./api"
import { takeWishlistIntent } from "./pendingIntent"

/** Login side effect (10.8): apply the heart the shopper clicked before signing in. Renders nothing. */
export function WishlistSessionSync() {
  const { status, user } = useAuth()
  const queryClient = useQueryClient()
  const userId = status === "authenticated" ? (user?.id ?? null) : null
  const running = useRef(false)

  useEffect(() => {
    if (!userId || running.current) return
    const productId = takeWishlistIntent()
    if (!productId) return
    running.current = true
    addToWishlist(productId) // idempotent on the server
      .then(() => {
        toast.success("Added to your wishlist")
        return queryClient.invalidateQueries({ queryKey: wishlistKeys.all })
      })
      .catch(() => toast.error("We could not add that item to your wishlist."))
      .finally(() => {
        running.current = false
      })
  }, [userId, queryClient])

  return null
}
