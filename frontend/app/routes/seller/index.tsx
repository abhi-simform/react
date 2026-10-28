import { Link } from "react-router"

import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { paths } from "@/lib/paths"
import { pageTitle } from "@/lib/pageTitle"
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
  return [{ title: pageTitle("Seller area") }]
}

export const handle = { breadcrumb: "Seller area" } satisfies RouteHandle
