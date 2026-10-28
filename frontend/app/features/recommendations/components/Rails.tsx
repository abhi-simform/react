import { useAuth } from "@/features/auth"
import { paths } from "@/lib/paths"

import { useLocalViews } from "../hooks/useLocalViews"
import { railQueries } from "../queries"
import { ProductRail } from "./ProductRail"

export function SimilarRail({ productId }: { productId: string }) {
  return (
    <ProductRail
      title="Similar products"
      options={railQueries.similar(productId)}
    />
  )
}

export function AlsoBoughtRail({ productId }: { productId: string }) {
  return (
    <ProductRail
      title="Customers also bought"
      options={railQueries.alsoBought(productId)}
    />
  )
}

export function TrendingRail({ category }: { category?: string }) {
  return (
    <ProductRail
      title="Trending now"
      options={railQueries.trending(category)}
      to={paths.products({ sort: "popularity", category })}
    />
  )
}

/** Signed in: the server knows the history. Guest: their local ids steer it. */
export function ForYouRail() {
  const { status, user } = useAuth()
  const { ids } = useLocalViews()
  const seed = ids.slice(0, 10)
  if (status === "loading") return null
  return (
    <ProductRail
      title="Recommended for you"
      options={railQueries.forYou(user?.id ?? "guest", user ? [] : seed)}
    />
  )
}

/**
 * Recently viewed = the UNION the shopper expects: signed in, the server list (the guest list was
 * merged into it at login); guest, the localStorage list. Nothing viewed = the rail is absent.
 */
export function RecentlyViewedRail() {
  const { status, user } = useAuth()
  const { ids } = useLocalViews()
  if (status === "loading") return null
  if (user)
    return (
      <ProductRail
        title="Recently viewed"
        options={railQueries.recentlyViewed(user.id)}
      />
    )
  if (ids.length === 0) return null
  return (
    <ProductRail
      title="Recently viewed"
      options={railQueries.guestRecentlyViewed(ids.slice(0, 8))}
    />
  )
}
