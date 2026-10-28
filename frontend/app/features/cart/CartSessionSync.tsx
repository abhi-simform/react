import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { toast } from "sonner"

import { useAuth } from "@/features/auth"
import { cartKeys } from "@/lib/queryKeys"

import { mergeGuestCart } from "./cart.api"
import { clearGuestToken, peekGuestToken } from "./cartToken"
import { useCartUi } from "./cartUiStore"

/**
 * Merge on login (9.6). Renders nothing. When a user becomes authenticated and this browser
 * still has a guest cart token, the guest cart is folded into the user's cart by the server
 * (`POST /cart/merge`, one transaction, safe to call twice) and the token is dropped. The
 * response is the merged cart, written straight into the user's cache entry. If the merge
 * FAILS the token is kept, so the next session (or the next reload) tries again; nothing is lost.
 */
export function CartSessionSync() {
  const { status, user } = useAuth()
  const queryClient = useQueryClient()
  const userId = status === "authenticated" ? (user?.id ?? null) : null
  const merging = useRef(false)

  useEffect(() => {
    const token = peekGuestToken()
    if (!userId || !token || merging.current) return
    merging.current = true
    void (async () => {
      try {
        await queryClient.cancelQueries({ queryKey: cartKeys.all })
        const { merge, ...cart } = await mergeGuestCart(token)
        clearGuestToken()
        useCartUi.getState().clearAllMessages() // they described the guest cart
        queryClient.setQueryData(cartKeys.current(userId), cart)
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
          toast.success("Your guest cart was added to your account")
      } catch {
        // keep the token: retried on the next session
      } finally {
        merging.current = false
      }
    })()
  }, [userId, queryClient])

  return null
}
