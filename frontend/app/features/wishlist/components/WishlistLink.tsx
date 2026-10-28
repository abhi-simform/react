import { Heart } from "lucide-react"
import { NavLink } from "react-router"

import { paths } from "@/lib/paths"
import { cn } from "@/lib/utils"

import { useWishlist } from "../WishlistContext"

/** Header entry: heart + count. The count comes from the shared Set, so it never needs its own request. */
export function WishlistLink() {
  const { count, status } = useWishlist()
  const label =
    status === "ready"
      ? `Wishlist, ${count} ${count === 1 ? "item" : "items"}`
      : "Wishlist"
  return (
    <NavLink
      to={paths.wishlist()}
      aria-label={label}
      className={({ isActive }) =>
        cn("flex items-center gap-1 rounded px-1", isActive && "bg-neutral-200")
      }
    >
      <Heart aria-hidden className="size-4" />
      {status === "ready" && count > 0 && (
        <span aria-hidden className="text-xs font-medium">
          {count}
        </span>
      )}
    </NavLink>
  )
}
