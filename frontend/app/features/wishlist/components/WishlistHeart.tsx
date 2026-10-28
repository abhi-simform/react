import { Heart } from "lucide-react"
import { useLocation, useNavigate } from "react-router"

import { useAuth } from "@/features/auth"
import { paths } from "@/lib/paths"
import { cn } from "@/lib/utils"

import { useWishlist } from "../WishlistContext"

type Props = {
  productId: string
  productName: string
  className?: string
}

/**
 * One heart, used on cards and the PDP. Signed-out users are sent to log in (and come
 * back); until the ids have loaded the button is inert (we cannot know the state yet).
 */
export function WishlistHeart({ productId, productName, className }: Props) {
  const { status: authStatus } = useAuth()
  const { status, isWishlisted, isPending, toggle } = useWishlist()
  const navigate = useNavigate()
  const location = useLocation()
  const liked = isWishlisted(productId)
  const pending = isPending(productId)
  const inert = pending || authStatus === "loading" || status === "loading"

  function onClick() {
    if (authStatus === "anonymous") {
      navigate(paths.login(), {
        state: { from: location.pathname + location.search },
      })
      return
    }
    if (!inert) void toggle(productId)
  }

  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-busy={pending || undefined}
      // aria-disabled (not `disabled`) keeps keyboard focus on the heart while it saves.
      aria-disabled={inert || undefined}
      aria-label={`${liked ? "Remove from wishlist" : "Add to wishlist"}: ${productName}`}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-full bg-white/90 shadow aria-disabled:opacity-60",
        className
      )}
    >
      <Heart
        aria-hidden
        className={cn("size-4", liked && "fill-red-500 text-red-500")}
      />
    </button>
  )
}
