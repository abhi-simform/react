import { Link } from "react-router"

import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { paths } from "@/lib/paths"
import { noindexMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

export default function SellerRoute() {
  return (
    <>
      <PlaceholderPage title="Seller area" builtIn="Admin track" />
      <p className="px-4">
        <Link to={paths.sellerNewProduct()} className="underline">
          New product (form only, 7.5)
        </Link>
      </p>
    </>
  )
}

export function meta() {
  return noindexMeta("Seller area")
}

export const handle = { breadcrumb: "Seller area" } satisfies RouteHandle
