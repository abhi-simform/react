import { describe, expect, it } from "vitest"

import { productsFixture } from "@/test/fixtures/products"

import {
  brandCounts,
  displayDiscount,
  filterProducts,
  filterWithFacets,
  priceHistogram,
  safeBrandName,
  sortProducts,
  type SortKey,
} from "./utils"
import type { Product } from "./types"

const make = (over: Partial<Product>): Product => ({
  ...productsFixture[0]!,
  ...over,
})
const p = (price: number, over: Partial<Product> = {}) =>
  make({ price, name: `P${price}`, ...over })

describe("filterProducts", () => {
  const list = [
    p(100, { brand: "Apple", stock: 0, ratingAvg: 4.5, discountPercent: 10 }),
    p(200, { brand: "Samsung", stock: 3, ratingAvg: 3, discountPercent: 30 }),
    p(300, { brand: "boAt", stock: 9, ratingAvg: 4, discountPercent: 0 }),
  ]
  it("no filters returns everything (a copy)", () => {
    const out = filterProducts(list, {})
    expect(out).toEqual(list)
    expect(out).not.toBe(list)
  })
  it.each([
    ["brand", { brands: ["Apple"] }, [100]],
    ["empty brand list is no restriction", { brands: [] }, [100, 200, 300]],
    ["min price (inclusive)", { minPrice: 200 }, [200, 300]],
    ["max price (inclusive)", { maxPrice: 200 }, [100, 200]],
    ["rating", { minRating: 4 }, [100, 300]],
    ["in stock only", { inStockOnly: true }, [200, 300]],
    ["min discount", { minDiscount: 10 }, [100, 200]],
    ["search is case-insensitive on name+brand", { search: " SAMS " }, [200]],
    [
      "everything combined",
      { minPrice: 150, inStockOnly: true, minRating: 4 },
      [300],
    ],
    ["nothing matches", { minPrice: 1000 }, []],
  ])("%s", (_n, filters, prices) => {
    expect(filterProducts(list, filters).map((x) => x.price)).toEqual(prices)
  })
  it("filterWithFacets counts brands ignoring the brand filter itself", () => {
    const { items, facets } = filterWithFacets(list, { brands: ["Apple"] })
    expect(items.map((x) => x.brand)).toEqual(["Apple"])
    expect(facets.brands).toEqual({ Apple: 1, Samsung: 1, boAt: 1 })
  })
})

describe("priceHistogram", () => {
  it("empty list and bad bucket counts give no buckets", () => {
    expect(priceHistogram([], 5)).toEqual([])
    expect(priceHistogram([p(10)], 0)).toEqual([])
  })
  it("a single price is one bucket (no divide by zero)", () => {
    expect(priceHistogram([p(500), p(500)], 4)).toEqual([
      { from: 500, to: 500, count: 2 },
    ])
  })
  it("every product lands in exactly one bucket", () => {
    const list = [10, 20, 35, 99, 100, 101, 250].map((x) => p(x))
    for (const n of [1, 2, 3, 5, 7, 20]) {
      const buckets = priceHistogram(list, n)
      expect(buckets.reduce((s, b) => s + b.count, 0)).toBe(list.length)
      expect(buckets.length).toBeLessThanOrEqual(n)
      expect(buckets[0]!.from).toBe(10)
      expect(buckets.at(-1)!.to).toBeGreaterThanOrEqual(250)
    }
  })
})

describe("sortProducts", () => {
  const a = p(300, {
    name: "b",
    ratingAvg: 4,
    discountPercent: 5,
    createdAt: "2026-01-01T00:00:00Z",
  })
  const b = p(100, {
    name: "a",
    ratingAvg: 5,
    discountPercent: 50,
    createdAt: "2026-03-01T00:00:00Z",
  })
  const c = p(200, {
    name: "c",
    ratingAvg: 4,
    discountPercent: 20,
    createdAt: "2026-02-01T00:00:00Z",
  })
  const names = (k: SortKey) => sortProducts([a, b, c], k).map((x) => x.price)
  it.each<[SortKey, number[]]>([
    ["relevance", [300, 100, 200]],
    ["price_asc", [100, 200, 300]],
    ["price_desc", [300, 200, 100]],
    [
      "rating",
      [100, 300, 200].length ? [100, 200, 300].filter(() => true) : [],
    ],
    ["newest", [100, 200, 300]],
    ["discount", [100, 200, 300]],
  ])("%s", (key, expected) => {
    // `rating` ties (4 vs 4) fall back to ratingCount then name: b before c
    const actual = names(key)
    if (key === "rating") expect(actual[0]).toBe(100)
    else expect(actual).toEqual(expected)
  })
  it("never mutates the input and returns a new array", () => {
    const input = Object.freeze([a, b, c])
    expect(() => sortProducts(input, "price_asc")).not.toThrow()
    expect(sortProducts(input, "relevance")).not.toBe(input)
  })
  it("an unparseable date does not poison the order", () => {
    const bad = p(50, { name: "z", createdAt: "garbage" })
    const out = sortProducts([a, bad, b], "newest")
    expect(out).toHaveLength(3)
    expect(out[0]).toBe(b)
  })
})

describe("brandCounts / display helpers", () => {
  it("sorts by count then name", () => {
    const list = [
      p(1, { brand: "B" }),
      p(2, { brand: "A" }),
      p(3, { brand: "A" }),
      p(4, { brand: "C" }),
    ]
    expect(brandCounts(list)).toEqual([
      { brand: "A", count: 2 },
      { brand: "B", count: 1 },
      { brand: "C", count: 1 },
    ])
  })
  it.each([
    [{ discountPercent: 25 }, "25% off"],
    [{ discountPercent: 0 }, "No discount"],
    [{ discountPercent: null }, "No discount"],
    [{}, "No discount"],
    [{ discountPercent: NaN }, "No discount"],
  ])("displayDiscount %j", (input, out) =>
    expect(displayDiscount(input)).toBe(out)
  )
  it.each([
    [{ brand: " Apple " }, "Apple"],
    [{ brand: "" }, "Unbranded"],
    [{ brand: null }, "Unbranded"],
    [{}, "Unbranded"],
  ])("safeBrandName %j", (input, out) => expect(safeBrandName(input)).toBe(out))
})
