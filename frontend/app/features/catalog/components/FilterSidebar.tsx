import { useId } from "react"

import type { ProductFiltersApi } from "../hooks/useProductFilters"
import { usePriceHistogram } from "../hooks/usePriceHistogram"
import type { Facets } from "../types"
import { CategoryList } from "./CategoryList"
import { PriceRangeFilter } from "./PriceRangeFilter"

const sameBrand = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
const RATING_STEPS = [4, 3, 2, 1]

type FilterSidebarProps = {
  categorySlug?: string
  facets?: Facets
  api: ProductFiltersApi
}

/**
 * Facet counts are DISJUNCTIVE (API, B1): each count ignores its own filter, so
 * after ticking Apple the Samsung box still says how many Samsung products
 * match the OTHER filters, and you can widen the OR instead of seeing 0s.
 */
export function FilterSidebar({
  categorySlug,
  facets,
  api,
}: FilterSidebarProps) {
  const { filters, toggleBrand, setPriceRange, setFilter } = api
  const ratingName = useId()
  const histogram = usePriceHistogram(categorySlug)

  const brands = facets?.brands ?? []
  // A brand in the URL that the facets do not list (typo, other category) stays visible and removable.
  const missing = filters.brands.filter(
    (b) => !brands.some((f) => sameBrand(f.value, b))
  )

  return (
    <div className="flex flex-col gap-5">
      <CategoryList activeSlug={categorySlug} />

      <fieldset className="text-sm">
        <legend className="font-medium">Brand</legend>
        <ul className="max-h-48 overflow-y-auto">
          {[
            ...brands.map((b) => ({ name: b.value, count: b.count })),
            ...missing.map((name) => ({ name, count: 0 })),
          ].map((b) => (
            <li key={b.name}>
              <label className="flex items-center gap-2 py-0.5">
                <input
                  type="checkbox"
                  checked={filters.brands.some((x) => sameBrand(x, b.name))}
                  onChange={() =>
                    toggleBrand(
                      filters.brands.find((x) => sameBrand(x, b.name)) ?? b.name
                    )
                  }
                />
                <span className="flex-1">{b.name}</span>
                <span className="text-neutral-500">{b.count}</span>
              </label>
            </li>
          ))}
          {brands.length === 0 && missing.length === 0 && (
            <li className="text-neutral-500">No brands</li>
          )}
        </ul>
      </fieldset>

      <PriceRangeFilter
        min={filters.minPrice}
        max={filters.maxPrice}
        bounds={facets?.price}
        histogram={histogram.status === "success" ? histogram.data : []}
        onChange={setPriceRange}
      />

      <fieldset className="text-sm">
        <legend className="font-medium">Rating</legend>
        <label className="flex items-center gap-2 py-0.5">
          <input
            type="radio"
            name={ratingName}
            checked={filters.minRating === undefined}
            onChange={() => setFilter("minRating", undefined)}
          />
          Any
        </label>
        {RATING_STEPS.map((step) => (
          <label key={step} className="flex items-center gap-2 py-0.5">
            <input
              type="radio"
              name={ratingName}
              checked={filters.minRating === step}
              onChange={() => setFilter("minRating", step)}
            />
            <span className="flex-1">{step} stars &amp; up</span>
            <span className="text-neutral-500">
              {facets?.rating.find((r) => r.value === step)?.count ?? ""}
            </span>
          </label>
        ))}
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={filters.inStock}
          onChange={(e) => setFilter("inStock", e.target.checked)}
        />
        <span className="flex-1">In stock only</span>
        <span className="text-neutral-500">{facets?.inStock.count ?? ""}</span>
      </label>
    </div>
  )
}
