import { X } from "lucide-react"

import { formatRupees } from "@/lib/format"

import type { ListingFilters } from "../filters"

type Chip = { key: string; label: string; remove: () => void }

type ActiveFilterChipsProps = {
  filters: ListingFilters
  /** Name of the preset category (on /c/:slug), if any. */
  categoryName?: string
  onRemoveCategory?: () => void
  onToggleBrand: (brand: string) => void
  onSetPriceRange: (min?: number, max?: number) => void
  onSetFilter: <K extends keyof ListingFilters>(
    key: K,
    value: ListingFilters[K]
  ) => void
  onClearAll: () => void
}

function priceLabel(min?: number, max?: number) {
  if (min !== undefined && max !== undefined)
    return `${formatRupees(min)} - ${formatRupees(max)}`
  if (min !== undefined) return `From ${formatRupees(min)}`
  return `Up to ${formatRupees(max ?? 0)}`
}

/** One removable chip per active filter, so nothing narrowing the list is hidden. */
export function ActiveFilterChips(props: ActiveFilterChipsProps) {
  const { filters } = props
  const chips: Chip[] = []
  if (props.categoryName && props.onRemoveCategory)
    chips.push({
      key: "category",
      label: `Category: ${props.categoryName}`,
      remove: props.onRemoveCategory,
    })
  if (filters.search)
    chips.push({
      key: "search",
      label: `Search: ${filters.search}`,
      remove: () => props.onSetFilter("search", undefined),
    })
  for (const brand of filters.brands)
    chips.push({
      key: `brand-${brand}`,
      label: `Brand: ${brand}`,
      remove: () => props.onToggleBrand(brand),
    })
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined)
    chips.push({
      key: "price",
      label: `Price: ${priceLabel(filters.minPrice, filters.maxPrice)}`,
      remove: () => props.onSetPriceRange(undefined, undefined),
    })
  if (filters.minRating !== undefined)
    chips.push({
      key: "rating",
      label: `${filters.minRating}+ stars`,
      remove: () => props.onSetFilter("minRating", undefined),
    })
  if (filters.inStock)
    chips.push({
      key: "inStock",
      label: "In stock",
      remove: () => props.onSetFilter("inStock", false),
    })

  if (chips.length === 0) return null
  return (
    <ul
      aria-label="Active filters"
      className="mb-3 flex flex-wrap gap-2 text-sm"
    >
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={chip.remove}
            aria-label={`Remove filter ${chip.label}`}
            className="flex items-center gap-1 rounded-full border px-2 py-0.5"
          >
            {chip.label}
            <X aria-hidden className="size-3" />
          </button>
        </li>
      ))}
      <li>
        <button type="button" onClick={props.onClearAll} className="underline">
          Clear all
        </button>
      </li>
    </ul>
  )
}
