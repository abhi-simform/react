import { Navigate, useSearchParams } from "react-router"

import { ProductListingPage } from "@/features/catalog"
import { paths } from "@/lib/paths"
import { canonicalUrl, pageMeta } from "@/lib/seo"
import type { Route } from "./+types/products"
import type { RouteHandle } from "@/types/route-handle"

export default function ProductsRoute() {
  const [searchParams] = useSearchParams()
  const legacyCategory = searchParams.get("category")
  if (legacyCategory) {
    // Old links used /products?category=x; the canonical URL is /c/x. A redirect
    // in render with `replace` leaves no dead entry behind for the Back button.
    const rest = new URLSearchParams(searchParams)
    rest.delete("category")
    rest.delete("page")
    const search = rest.toString()
    return (
      <Navigate
        to={paths.category(legacyCategory) + (search ? `?${search}` : "")}
        replace
      />
    )
  }
  return <ProductListingPage />
}

export function meta({ location }: Route.MetaArgs) {
  const params = new URLSearchParams(location.search)
  const search = params.get("search")
  return pageMeta({
    title: search ? `Search: ${search}` : "Products",
    description: search
      ? `Search results for ${search} on ShopSphere.`
      : "Browse and filter every product on ShopSphere: electronics, fashion, home, beauty, books and more.",
    // Filters and sort orders are not pages of their own: they all canonicalise to the plain listing
    // (`page` is the one parameter that is a real, different page).
    canonical: canonicalUrl("/products", location.search, ["page"]),
    // Internal search results are thin, endless pages: keep them out of the index.
    noindex: Boolean(search),
  })
}

export const handle = { breadcrumb: "Products" } satisfies RouteHandle
