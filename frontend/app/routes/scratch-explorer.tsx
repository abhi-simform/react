// Throwaway Stage 1 route: a client-side product explorer over the static fixture.
import { useState } from "react"

import { filterWithFacets } from "@/features/catalog/utils"
import type { Product, ProductFilters } from "@/features/catalog/types"
import snapshot from "@/test/fixtures/products.json"

const products = snapshot.data as Product[]

function toNumber(value: string): number | undefined {
  // "" must mean "no limit", not 0 (Number("") === 0).
  if (value.trim() === "") return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export default function ScratchExplorer() {
  const [filters, setFilters] = useState<ProductFilters>({})

  const { items, facets } = filterWithFacets(products, filters)
  const brandOptions = Object.entries(facets.brands).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  )

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
    <main className="grid gap-4 p-4 md:grid-cols-[16rem_1fr]">
      <aside className="flex flex-col gap-3 text-sm">
        <label className="flex flex-col">
          Search
          <input
            className="border p-1"
            value={filters.search ?? ""}
            onChange={(e) => patch({ search: e.target.value })}
          />
        </label>
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
        <ul className="grid gap-1 text-sm">
          {items.map((p) => (
            <li key={p._id}>
              {p.name} · {p.brand} · ₹{p.price} · {p.ratingAvg}★ · stock{" "}
              {p.stock} · {p.discountPercent}% off
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
