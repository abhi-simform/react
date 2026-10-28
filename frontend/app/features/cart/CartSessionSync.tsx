import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { useAuth } from "@/features/auth"
import { cartKeys } from "@/lib/queryKeys"

import { mergeGuestCart } from "./cart.api"
import { clearGuestToken, peekGuestToken } from "./cartToken"
import { useCartUi } from "./cartUiStore"

/**
 * Merge on login (9.6, 10.8). Renders nothing. Logging in is an EVENT with a side effect: when a
 * user becomes authenticated (password, register, Google callback, another tab: all end up as
 * the same `userId` change) and this browser still has a guest cart token, the guest cart is
 * folded into the user's cart by the server (`POST /cart/merge`, one transaction, quantities
 * add and are capped by stock) and the token is dropped.
 *
 * - Exactly once: `merging` stops a second run while one is in flight (StrictMode's double effect, fast
 *   navigation), and the token is cleared on success, so any later run finds nothing to do.
 * - A failure never blocks login: the token is KEPT, and the toast offers "Retry" (the
 *   next session or reload would also try again). Nothing is lost.
 * - The response is the merged cart, written straight into the user's cache entry.
 */
export function CartSessionSync() {
  const { status, user } = useAuth()
  const queryClient = useQueryClient()
  const userId = status === "authenticated" ? (user?.id ?? null) : null
  const merging = useRef(false)
  // The toast's Retry button bumps this; the effect below then runs the merge again.
  const [retries, setRetries] = useState(0)

  const run = useCallback(
    async (uid: string) => {
      const token = peekGuestToken()
      if (!token || merging.current) return
      merging.current = true
      try {
        await queryClient.cancelQueries({ queryKey: cartKeys.all })
        const { merge, ...cart } = await mergeGuestCart(token)
        clearGuestToken()
        useCartUi.getState().clearAllMessages() // they described the guest cart
        queryClient.setQueryData(cartKeys.current(uid), cart)
        void queryClient.invalidateQueries({
          queryKey: cartKeys.all,
          refetchType: "none",
        })
        for (const a of merge.adjusted)
          toast.warning(
            `Only ${a.applied} of ${a.name} are available, so your cart has ${a.applied} (you asked for ${a.requested})`
          )
        for (const s of merge.skipped)
          toast.warning(
            `${s.name} could not be added to your cart (${s.reason.toLowerCase().replace("_", " ")})`
          )
        if (merge.merged > 0)
          toast.success(
            `We moved ${merge.merged} ${merge.merged === 1 ? "item" : "items"} from your guest cart`
          )
      } catch {
        toast.error("We could not add your guest cart to your account.", {
          id: "cart-merge-failed",
          action: { label: "Retry", onClick: () => setRetries((n) => n + 1) },
        })
      } finally {
        merging.current = false
      }
    },
    [queryClient]
  )

  useEffect(() => {
    if (userId) void run(userId)
  }, [userId, run, retries])

  return null
}
