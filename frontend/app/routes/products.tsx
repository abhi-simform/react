import { Navigate, useSearchParams } from "react-router"

import { ProductListingPage } from "@/features/catalog/components/ProductListingPage"
import { paths } from "@/lib/paths"

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
