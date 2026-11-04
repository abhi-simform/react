import { Link } from "react-router"

import { ProductDetailView } from "@/features/product/components/ProductDetailView"
import {
  productDetailFixture,
  relatedFixture,
} from "@/test/fixtures/productDetails"
import { variantsFixture } from "@/test/fixtures/variants"

import type { Route } from "./+types/product-detail"

// Static PDP (Stage 3): reads from the fixture, no fetching yet.
export default function ProductDetailRoute({ params }: Route.ComponentProps) {
  const product = productDetailFixture(params.productSlug)
  const variants = product ? variantsFixture(product) : []
  if (!product) {
    return (
      <main className="p-4">
        <h1>Product not found</h1>
        <Link to="/scratch/grid">Back to the grid</Link>
      </main>
    )
  }
  return (
    <main className="mx-auto max-w-5xl p-4">
      <ProductDetailView product={product} variants={variants} />
      <nav aria-label="Related products" className="mt-6 text-sm">
        <h2 className="font-medium">Related products</h2>
        <ul>
          {relatedFixture(product.slug).map((p) => (
            <li key={p._id}>
              <Link className="underline" to={`/p/${p.slug}`}>
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  )
}
