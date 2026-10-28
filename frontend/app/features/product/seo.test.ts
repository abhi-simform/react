import { describe, expect, it } from "vitest"

import { productsFixture } from "@/test/fixtures/products"
import type { ProductDetail } from "@/features/catalog"

import { breadcrumbJsonLd, productDescription, productJsonLd } from "./seo"

const product = {
  ...productsFixture[0]!,
  description: "A long   description\nwith  odd whitespace. ".repeat(12),
  highlights: [],
  specs: [],
  categoryPath: [
    { _id: "1", name: "Electronics", slug: "electronics" },
    { _id: "2", name: "Mobiles", slug: "mobiles" },
  ],
} as unknown as ProductDetail

describe("productJsonLd", () => {
  it("describes the product with an INR offer and availability", () => {
    const ld = productJsonLd(
      { ...product, stock: 3, deal: null },
      "https://shop.test"
    )
    expect(ld).toMatchObject({
      "@type": "Product",
      name: product.name,
      sku: product.sku,
      brand: { "@type": "Brand", name: product.brand },
      offers: {
        "@type": "Offer",
        priceCurrency: "INR",
        price: product.price,
        availability: "https://schema.org/InStock",
        url: `https://shop.test/p/${product.slug}`,
      },
    })
    expect(ld.image).toEqual(product.images.map((i) => i.url))
  })
  it("uses the live deal price and reports out of stock", () => {
    const ld = productJsonLd(
      {
        ...product,
        stock: 0,
        deal: { dealPrice: 99 } as ProductDetail["deal"],
      },
      "https://shop.test"
    )
    expect(ld.offers).toMatchObject({
      price: 99,
      availability: "https://schema.org/OutOfStock",
    })
  })
  it("omits aggregateRating when there are no ratings (it would be invalid)", () => {
    expect(
      "aggregateRating" in productJsonLd({ ...product, ratingCount: 0 }, "x")
    ).toBe(false)
    expect(
      productJsonLd({ ...product, ratingCount: 4, ratingAvg: 3.46 }, "x")
    ).toMatchObject({
      aggregateRating: { ratingValue: 3.5, reviewCount: 4 },
    })
  })
})

describe("description and breadcrumbs", () => {
  it("collapses whitespace and stays under 156 characters", () => {
    const d = productDescription(product)
    expect(d.length).toBeLessThanOrEqual(155)
    expect(d).not.toMatch(/\s{2}|\n/)
    expect(d.endsWith("…")).toBe(true)
  })
  it("falls back to name, brand and shop when there is no description", () => {
    expect(productDescription({ name: "N", brand: "B", description: "" })).toBe(
      "N by B. Buy online at ShopSphere."
    )
  })
  it("numbers the trail from 1: Home > categories > product", () => {
    const ld = breadcrumbJsonLd(product, "https://shop.test")
    expect(ld.itemListElement.map((e) => [e.position, e.name])).toEqual([
      [1, "Home"],
      [2, "Electronics"],
      [3, "Mobiles"],
      [4, product.name],
    ])
    expect(ld.itemListElement[1]!.item).toBe("https://shop.test/c/electronics")
  })
})
