import { ProductListingPage } from "@/features/catalog"

import { RouteErrorView } from "@/components/common/RouteErrorView"

import type { Route } from "./+types/category"

// Same page as /products with a preset category from the path.
import { canonicalUrl, pageMeta } from "@/lib/seo"

export default function CategoryRoute({ params }: Route.ComponentProps) {
  return <ProductListingPage categorySlug={params.categorySlug} />
}

// Below the shell: header and footer stay, only this slot shows the error.
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteErrorView error={error} />
}

const prettify = (slug: string) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

export function meta({ params, location }: Route.MetaArgs) {
  const name = prettify(params.categorySlug)
  return pageMeta({
    title: name,
    description: `Shop ${name} online at ShopSphere: compare prices, ratings and offers.`,
    canonical: canonicalUrl(`/c/${params.categorySlug}`, location.search, [
      "page",
    ]),
  })
}
