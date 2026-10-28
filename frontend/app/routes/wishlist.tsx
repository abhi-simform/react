import { Link } from "react-router"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { ProductGrid } from "@/features/catalog"
import { useWishlist, useWishlistProducts } from "@/features/wishlist"
import { assertNever } from "@/lib/assert"
import { pageTitle } from "@/lib/pageTitle"
import { paths } from "@/lib/paths"
import type { RouteHandle } from "@/types/route-handle"

/**
 * Composition only: the wishlist feature owns the data, the catalog owns the grid.
 * A product disappears the moment it leaves the shared Set (instant remove); if the
 * request fails the Set rolls back and the card comes back with a toast.
 */
export default function WishlistRoute() {
  const state = useWishlistProducts()
  const wishlist = useWishlist()
  let content: React.ReactNode
  switch (state.status) {
    case "idle":
    case "loading":
      content = <p aria-busy="true">Loading your wishlist...</p>
      break
    case "error":
      content = <ErrorState error={state.error} onRetry={state.reload} />
      break
    case "success": {
      const items = state.data.items.filter((p) => wishlist.isWishlisted(p._id))
      content =
        items.length === 0 ? (
          <EmptyState title="Your wishlist is empty">
            <Link className="underline" to={paths.products()}>
              Browse products
            </Link>
          </EmptyState>
        ) : (
          <ProductGrid products={items} />
        )
      break
    }
    default:
      content = assertNever(state)
  }
  return (
    <div className="p-4">
      <h1 className="mb-3 text-xl font-medium">Wishlist</h1>
      {content}
    </div>
  )
}

export function meta() {
  return [{ title: pageTitle("Wishlist") }]
}

export const handle = { breadcrumb: "Wishlist" } satisfies RouteHandle
