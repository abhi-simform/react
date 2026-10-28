// Throwaway Stage 1 route: a client-side product explorer over the static fixture.
import { useState } from "react"

import {
  brandCounts,
  filterProducts,
  loadHomeData,
  filterWithFacets,
  priceHistogram,
  sortProducts,
  type HomeData,
  type ProductFilters,
  type SortKey,
} from "@/features/catalog"
import { getJson } from "@/lib/api/getJson"
import { isAbortError, withTimeout } from "@/lib/async"
import { env } from "@/lib/env"
import { formatCurrency } from "@/lib/format"
import { toPaise } from "@/lib/money"
import { productsFixture } from "@/test/fixtures/products"

const products = productsFixture
const topBrands = brandCounts(products).slice(0, 5)

function toNumber(value: string): number | undefined {
  // "" must mean "no limit", not 0 (Number("") === 0).
  if (value.trim() === "") return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

// 1.6 playground: promises against the real API, triggered from event handlers (no effects yet).
function AsyncLab() {
  const [home, setHome] = useState<HomeData | null>(null)
  const [log, setLog] = useState<string[]>([])
  const addLog = (line: string) => setLog((prev) => [...prev, line])

  async function load() {
    setHome(await loadHomeData())
  }

  async function timeoutDemo() {
    try {
      await withTimeout(
        (signal) =>
          getJson(`${env.VITE_API_URL}/products?limit=60`, { signal }),
        1
      )
      addLog("finished before 1ms timeout")
    } catch (error) {
      addLog(
        isAbortError(error)
          ? "aborted by timeout (AbortError)"
          : `real failure: ${String(error)}`
      )
    }
  }

  async function timings() {
    const call = () => getJson(`${env.VITE_API_URL}/products?limit=60`)
    let t = performance.now()
    await call()
    await call()
    await call()
    const sequential = performance.now() - t
    t = performance.now()
    await Promise.all([call(), call(), call()])
    const parallel = performance.now() - t
    addLog(
      `sequential ${sequential.toFixed(0)}ms vs Promise.all ${parallel.toFixed(0)}ms`
    )
  }

  return (
    <section className="border-t pt-3 text-sm md:col-span-2">
      <h2 className="font-medium">Async lab (1.6)</h2>
      <div className="my-2 flex gap-2">
        <button className="border p-1" onClick={load}>
          Load home data (allSettled)
        </button>
        <button className="border p-1" onClick={timeoutDemo}>
          Timeout after 1ms
        </button>
        <button className="border p-1" onClick={timings}>
          Sequential vs parallel
        </button>
      </div>
      {home && (
        <div>
          <p>
            newest: {home.newest ? `${home.newest.length} items` : "failed"}
          </p>
          <p>
            topRated:{" "}
            {home.topRated ? `${home.topRated.length} items` : "failed"}
          </p>
          {home.errors.map((e) => (
            <p key={e} role="alert" className="text-red-600">
              {e}
            </p>
          ))}
        </div>
      )}
      <ul>
        {log.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </section>
  )
}

export default function ScratchExplorer() {
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
        <ul className="grid gap-1 text-sm">
          {items.map((p) => (
            <li key={p._id}>
              {p.name} · {p.brand} · {formatCurrency(toPaise(p.price))} ·{" "}
              {p.ratingAvg}★ · stock {p.stock} · {p.discountPercent}% off
            </li>
          ))}
        </ul>
      </section>
      <AsyncLab />
    </main>
  )
}
