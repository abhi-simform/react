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
