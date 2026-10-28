import { Link } from "react-router"

import { Heart } from "lucide-react"

import { AsyncView } from "@/components/common/AsyncView"
import { EmptyState } from "@/components/common/EmptyState"
import { ProductGridSkeleton } from "@/components/common/Skeletons"
import { ProductGrid } from "@/features/catalog"
import { useWishlist, useWishlistProducts } from "@/features/wishlist"
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
  return (
    <div className="p-4">
      <h1 className="mb-3 text-xl font-medium">Wishlist</h1>
      <AsyncView
        state={state}
        loading={<ProductGridSkeleton count={8} />}
        empty={(data) =>
          wishlist.status === "ready" &&
          data.items.every((p) => !wishlist.isWishlisted(p._id)) && (
            <EmptyState
              icon={<Heart className="size-8" />}
              title="Your wishlist is empty"
              description="Tap the heart on any product to save it here."
              action={
                <Link className="underline" to={paths.products()}>
                  Browse products
                </Link>
              }
            />
          )
        }
      >
        {(data) => (
          <ProductGrid
            products={data.items.filter((p) => wishlist.isWishlisted(p._id))}
          />
        )}
      </AsyncView>
    </div>
  )
}

export function meta() {
  return [{ title: pageTitle("Wishlist") }]
}

export const handle = { breadcrumb: "Wishlist" } satisfies RouteHandle
