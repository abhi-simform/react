import { ProductForm } from "@/features/seller"
import { noindexMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

export default function SellerNewProductRoute() {
  return <ProductForm />
}

export function meta() {
  return noindexMeta("New product")
}

export const handle = { breadcrumb: "New product" } satisfies RouteHandle
