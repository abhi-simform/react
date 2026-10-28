// Throwaway Stage 1 explorer: a client-side product explorer over the static fixture.
import { useState } from "react"

import { List } from "@/components/common/List"
import { Rating } from "@/components/common/Rating"
import {
  brandCounts,
  filterProducts,
  filterWithFacets,
  priceHistogram,
  sortProducts,
  type ProductFilters,
  type SortKey,
} from "@/features/catalog"
import { formatCurrency } from "@/lib/format"
import { toPaise } from "@/lib/money"
import { productsFixture } from "@/test/fixtures/products"

import { AsyncLab } from "./AsyncLab"
import { TypedLab } from "./TypedLab"

const products = productsFixture
const topBrands = brandCounts(products).slice(0, 5)

function toNumber(value: string): number | undefined {
  // "" must mean "no limit", not 0 (Number("") === 0).
  if (value.trim() === "") return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export function Explorer() {
  const [filters, setFilters] = useState<ProductFilters>({})
  const [sortKey, setSortKey] = useState<SortKey>("relevance")

  const { items: filtered, facets } = filterWithFacets(products, filters)
  const items = sortProducts(filtered, sortKey)
  const brandOptions = Object.entries(facets.brands).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  )

  // Histogram ignores the price filter itself, otherwise it would collapse to the selected range.
  const histogram = priceHistogram(
    filterProducts(products, {
      ...filters,
      minPrice: undefined,
      maxPrice: undefined,
    }),
    10
  )
  const maxCount = Math.max(1, ...histogram.map((b) => b.count))

  function patch(next: Partial<ProductFilters>) {
    setFilters((prev) => ({ ...prev, ...next }))
  }

  function toggleBrand(brand: string) {
    const current = new Set(filters.brands ?? [])
    if (current.has(brand)) current.delete(brand)
    else current.add(brand)
    patch({ brands: [...current] })
  }

  return (
    <div className="grid gap-4 p-4 md:grid-cols-[16rem_1fr]">
      <aside className="flex flex-col gap-3 text-sm">
        <label className="flex flex-col">
          Search
          <input
            className="border p-1"
            value={filters.search ?? ""}
            onChange={(e) => patch({ search: e.target.value })}
          />
        </label>
        <div
          aria-label="Price histogram"
          className="flex h-24 items-end gap-0.5"
        >
          {histogram.map((bucket) => (
            <button
              key={bucket.from}
              type="button"
              title={`₹${bucket.from} - ₹${bucket.to}: ${bucket.count}`}
              aria-label={`₹${bucket.from} to ₹${bucket.to}: ${bucket.count} products`}
              className="flex-1 bg-gray-400 hover:bg-gray-600"
              style={{ height: `${(bucket.count / maxCount) * 100}%` }}
              onClick={() =>
                patch({ minPrice: bucket.from, maxPrice: bucket.to })
              }
            />
          ))}
        </div>
        <label className="flex flex-col">
          Min price
          <input
            className="border p-1"
            inputMode="numeric"
            value={filters.minPrice ?? ""}
            onChange={(e) => patch({ minPrice: toNumber(e.target.value) })}
          />
        </label>
        <label className="flex flex-col">
          Max price
          <input
            className="border p-1"
            inputMode="numeric"
            value={filters.maxPrice ?? ""}
            onChange={(e) => patch({ maxPrice: toNumber(e.target.value) })}
          />
        </label>
        <label className="flex flex-col">
          Min rating
          <input
            className="border p-1"
            inputMode="decimal"
            value={filters.minRating ?? ""}
            onChange={(e) => patch({ minRating: toNumber(e.target.value) })}
          />
        </label>
        <label className="flex flex-col">
          Min discount %
          <input
            className="border p-1"
            inputMode="numeric"
            value={filters.minDiscount ?? ""}
            onChange={(e) => patch({ minDiscount: toNumber(e.target.value) })}
          />
        </label>
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={filters.inStockOnly ?? false}
            onChange={(e) => patch({ inStockOnly: e.target.checked })}
          />
          In stock only
        </label>
        <fieldset className="max-h-64 overflow-auto">
          <legend>Brands (counts ignore the brand filter)</legend>
          {brandOptions.map(([brand, n]) => (
            <label key={brand} className="flex gap-2">
              <input
                type="checkbox"
                checked={filters.brands?.includes(brand) ?? false}
                onChange={() => toggleBrand(brand)}
              />
              {brand} ({n})
            </label>
          ))}
        </fieldset>
        <button className="border p-1" onClick={() => setFilters({})}>
          Clear filters
        </button>
      </aside>
      <section>
        <p role="status" className="mb-2 font-medium">
          {items.length} of {products.length} products
        </p>
        <label className="mb-2 flex gap-2 text-sm">
          Sort
          <select
            className="border"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="relevance">Relevance</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="rating">Rating</option>
            <option value="newest">Newest</option>
            <option value="discount">Discount</option>
          </select>
        </label>
        <p className="mb-2 text-sm">
          Top brands overall:{" "}
          {topBrands.map((b) => `${b.brand} (${b.count})`).join(", ")}
        </p>
        <div className="grid gap-1 text-sm">
          <List
            items={items}
            getKey={(p) => p._id}
            renderItem={(p) => (
              <>
                {p.name} · {p.brand} · {formatCurrency(toPaise(p.price))} ·{" "}
                <Rating value={p.ratingAvg} count={p.ratingCount} size="sm" /> ·
                stock {p.stock} · {p.discountPercent}% off
              </>
            )}
            empty={<p>No products match these filters.</p>}
          />
        </div>
      </section>
      <TypedLab />
      <AsyncLab />
    </div>
  )
}
