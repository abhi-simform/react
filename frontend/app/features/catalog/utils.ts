// Pure functions: no React, no globals, no mutation of inputs.
import type { Product, ProductFilters } from "./types.ts"

type FilterKey = keyof ProductFilters

function matches(
  product: Product,
  filters: ProductFilters,
  brandSet: Set<string> | undefined,
  needle: string,
  skip?: FilterKey
): boolean {
  if (skip !== "brands" && brandSet && !brandSet.has(product.brand))
    return false
  if (filters.minPrice !== undefined && product.price < filters.minPrice)
    return false
  if (filters.maxPrice !== undefined && product.price > filters.maxPrice)
    return false
  if (filters.minRating !== undefined && product.ratingAvg < filters.minRating)
    return false
  if (filters.inStockOnly && product.stock <= 0) return false
  if (
    filters.minDiscount !== undefined &&
    product.discountPercent < filters.minDiscount
  )
    return false
  if (
    needle &&
    !`${product.name} ${product.brand}`.toLowerCase().includes(needle)
  )
    return false
  return true
}

function prepare(filters: ProductFilters) {
  // Empty brand list means "no brand restriction", not "match nothing".
  const brandSet = filters.brands?.length ? new Set(filters.brands) : undefined
  const needle = filters.search?.trim().toLowerCase() ?? ""
  return { brandSet, needle }
}

export function filterProducts(
  products: readonly Product[],
  filters: ProductFilters
): Product[] {
  const { brandSet, needle } = prepare(filters)
  return products.filter((p) => matches(p, filters, brandSet, needle))
}

/**
 * Disjunctive facets: each brand count is computed against every active filter
 * EXCEPT the brand filter itself, so selecting "Apple" does not zero out
 * "Samsung" in the sidebar (you can still add it to the OR).
 * The backend's facet counts (B1) must follow the same rule.
 */
export function filterWithFacets(
  products: readonly Product[],
  filters: ProductFilters
): { items: Product[]; facets: { brands: Record<string, number> } } {
  const { brandSet, needle } = prepare(filters)
  const items: Product[] = []
  const brands: Record<string, number> = {}
  for (const p of products) {
    if (!matches(p, filters, brandSet, needle, "brands")) continue
    brands[p.brand] = (brands[p.brand] ?? 0) + 1
    if (!brandSet || brandSet.has(p.brand)) items.push(p)
  }
  return { items, facets: { brands } }
}

export type PriceBucket = { from: number; to: number; count: number }

/**
 * Equal-width buckets across min..max (integer rupee ranges, `to` inclusive).
 * Empty list -> []. All prices equal -> one bucket (no divide by zero).
 * Fewer than `bucketCount` buckets come back when the price range is narrower
 * than the bucket count.
 */
export function priceHistogram(
  products: readonly Product[],
  bucketCount: number
): PriceBucket[] {
  if (products.length === 0 || bucketCount < 1) return []

  let min = Infinity
  let max = -Infinity
  for (const { price } of products) {
    if (price < min) min = price
    if (price > max) max = price
  }

  const span = max - min + 1
  const width = Math.ceil(span / bucketCount)
  const buckets: PriceBucket[] = Array.from(
    { length: Math.ceil(span / width) },
    (_, i) => ({
      from: min + i * width,
      to: min + (i + 1) * width - 1,
      count: 0,
    })
  )
  for (const { price } of products) {
    const bucket = buckets[Math.floor((price - min) / width)]
    if (bucket) bucket.count++
  }
  return buckets
}

/** Brand -> count, sorted by count desc then name. Uses Map.groupBy. */
export function brandCounts(
  products: readonly Product[]
): { brand: string; count: number }[] {
  const groups = Map.groupBy(products, (p) => p.brand)
  return [...groups]
    .map(([brand, items]) => ({ brand, count: items.length }))
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand))
}
