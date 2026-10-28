import { ProductForm } from "@/features/seller"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function SellerNewProductRoute() {
  return <ProductForm />
}

export function meta() {
  return [{ title: pageTitle("New product") }]
}

export const handle = { breadcrumb: "New product" } satisfies RouteHandle
