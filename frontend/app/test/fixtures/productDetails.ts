import type { ProductDetail } from "@/features/catalog"

import { productsFixture } from "./products"

/** List fixture + the long-form fields the detail endpoint adds (invented here). */
export function productDetailFixture(slug: string): ProductDetail | undefined {
  const p = productsFixture.find((x) => x.slug === slug)
  if (!p) return undefined
  const { categoryPath: _ids, ...rest } = p
  return {
    ...rest,
    categoryPath: [p.category],
    description:
      `${p.name} by ${p.brand}. Fixture text standing in for the real description: it is long enough to wrap onto several lines so the Description tab has something to show. `.repeat(
        3
      ),
    highlights: [
      "Genuine product",
      "1 year brand warranty",
      "Easy 7-day returns",
    ],
    specs: [
      { key: "Brand", value: p.brand },
      { key: "Category", value: p.category.name },
      { key: "SKU", value: p.sku },
      { key: "Seller", value: p.seller },
    ],
  }
}

/** Two other products from the fixture, for the "related" links. */
export function relatedFixture(slug: string) {
  return productsFixture.filter((p) => p.slug !== slug).slice(0, 2)
}
