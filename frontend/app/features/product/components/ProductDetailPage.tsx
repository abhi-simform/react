import { Link, useSearchParams } from "react-router"

import { ErrorState } from "@/components/common/ErrorState"
import { paths } from "@/lib/paths"

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
              className="underline"
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
export function ProductDetailPage({ slug }: { slug: string }) {
  // 3.5 bug demo: add ?bug-no-key to render WITHOUT the key and see product A's
  // selection, quantity and gallery index leak into product B.
  const [searchParams] = useSearchParams()
  const withoutKey = searchParams.has("bug-no-key")
  const state = useProduct(slug)

  if (state.status === "idle" || state.status === "loading") {
    return (
      <div className="p-4" aria-busy="true">
        <h1 className="text-xl font-medium">Loading product...</h1>
      </div>
    )
  }
  if (state.status === "error") {
    if (state.error.status === 404) {
      return (
        <div className="p-4">
          <h1 className="text-xl font-medium">Product not found</h1>
          <p className="my-2 text-sm">
            We could not find a product called &ldquo;{slug}&rdquo;. It may have
            been removed, or the link is mistyped.
          </p>
          <Link to={paths.home()} className="underline">
            Back to the home page
          </Link>
        </div>
      )
    }
    return (
      <div className="p-4">
        <h1 className="text-xl font-medium">Could not load product</h1>
        <ErrorState error={state.error} onRetry={state.reload} />
      </div>
    )
  }

  const product = state.data
  return (
    <div className="mx-auto max-w-5xl p-4">
      {/* key = identity: a new slug is a new component, so all state resets. */}
      <ProductDetailView
        key={withoutKey ? undefined : product.slug}
        product={product}
        variants={variantsFixture(product)}
      />
      <RelatedProducts
        categorySlug={product.category.slug}
        slug={product.slug}
        keepBugFlag={withoutKey}
      />
    </div>
  )
}
