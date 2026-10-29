import { ProductSeo } from "./ProductSeo"
import { DetailSkeleton } from "@/components/common/Skeletons"
import { Link, useSearchParams } from "react-router"

import { ErrorState } from "@/components/common/ErrorState"
import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { NotFoundError } from "@/lib/notFound"
import { paths } from "@/lib/paths"

import { toProductDetailVM, type ProductDetail } from "@/features/catalog"
import {
  AlsoBoughtRail,
  RecentlyViewedRail,
  SimilarRail,
} from "@/features/recommendations"
import { useProduct, useRelatedProducts } from "../hooks/useProduct"
import { variantsFixture } from "@/test/fixtures/variants"

import { ProductDetailView } from "./ProductDetailView"

function RelatedProducts({
  categorySlug,
  slug,
  keepBugFlag,
}: {
  categorySlug: string
  slug: string
  keepBugFlag: boolean
}) {
  const related = useRelatedProducts(categorySlug, slug)
  if (related.status !== "success" || related.data.length === 0) return null
  return (
    <nav aria-label="Related products" className="mt-6 text-sm">
      <h2 className="font-medium">Related products</h2>
      <ul>
        {related.data.map((p) => (
          <li key={p._id}>
            <Link
              className="inline-block min-h-6 py-0.5 underline"
              to={paths.product(p.slug) + (keepBugFlag ? "?bug-no-key" : "")}
            >
              {p.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** The PDP: fetch by slug, then loading / not found / error / content. */
export function ProductDetailPage({
  slug,
  initialProduct,
  initialLoadedAt,
}: {
  slug: string
  /** 14.8: the product the server loader already fetched (SSR); omitted in SPA mode. */
  initialProduct?: ProductDetail
  initialLoadedAt?: number
}) {
  // 3.5 bug demo: add ?bug-no-key to render WITHOUT the key and see product A's
  // selection, quantity and gallery index leak into product B.
  const [searchParams] = useSearchParams()
  const withoutKey = searchParams.has("bug-no-key")
  const state = useProduct(
    slug,
    initialProduct && initialLoadedAt !== undefined
      ? { product: initialProduct, loadedAt: initialLoadedAt }
      : undefined
  )
  // Generic title from the route's `meta` until the product is known, then its name.
  useDocumentTitle(state.status === "success" ? state.data.name : "Product")

  if (state.status === "idle" || state.status === "loading") {
    return (
      // `min-h-svh`: the page is a screen tall while loading, so the footer starts BELOW the fold and
      // does not jump out of view when the real (taller) page replaces this one (CLS 0.52 before, 13.5).
      <div className="mx-auto min-h-svh max-w-5xl p-4" aria-busy="true">
        <h1 className="mb-4 text-xl font-medium">Loading product...</h1>
        <DetailSkeleton />
      </div>
    )
  }
  if (state.status === "error") {
    // 404 is a "route-level" outcome: hand it to the ErrorBoundary (branded 404).
    if (state.error.status === 404) throw new NotFoundError("Product", slug)
    return (
      <div className="p-4">
        <h1 className="text-xl font-medium">Could not load product</h1>
        <ErrorState error={state.error} onRetry={state.reload} />
      </div>
    )
  }

  const product = state.data
  const view = toProductDetailVM(product)
  return (
    <div className="mx-auto max-w-5xl">
      {/* Full metadata only once the real detail (with its description) is here, not for the list placeholder. */}
      {!state.isPlaceholder && <ProductSeo product={product} />}
      {/* Home > Electronics > Mobiles > Apple > iPhone 15 (real category path from the API). */}
      <Breadcrumbs
        trail={[
          ...product.categoryPath.map((c) => ({
            label: c.name,
            to: paths.category(c.slug),
          })),
          {
            label: product.brand,
            to: paths.category(product.category.slug, { brand: product.brand }),
          },
          { label: product.name },
        ]}
      />
      <div className="p-4">
        {/* key = identity: a new slug is a new component, so all state resets. */}
        <ProductDetailView
          key={withoutKey ? undefined : product.slug}
          product={view}
          variants={variantsFixture(product)}
          detailsPending={state.isPlaceholder}
        />
        {/* B8 rails: each loads itself when scrolled near, and renders nothing if it has nothing. */}
        {!state.isPlaceholder && (
          <div className="mt-6 flex flex-col gap-6">
            <SimilarRail productId={product._id} />
            <AlsoBoughtRail productId={product._id} />
            <RecentlyViewedRail />
          </div>
        )}
        <RelatedProducts
          categorySlug={product.category.slug}
          slug={product.slug}
          keepBugFlag={withoutKey}
        />
      </div>
    </div>
  )
}
