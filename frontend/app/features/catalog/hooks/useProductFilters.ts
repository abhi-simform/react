import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router"

import { useLocalStorage } from "@/hooks/useLocalStorage"

import {
  BUILT_IN_DEFAULTS,
  countActiveFilters,
  parseFilters,
  toSearchParams,
  type ListingDefaults,
  type ListingFilters,
} from "../filters"
import { productSortSchema } from "../schemas"

const PREFS_KEY = "shopsphere.listingPrefs"

function isListingDefaults(value: unknown): value is ListingDefaults {
  return (
    typeof value === "object" &&
    value !== null &&
    "sort" in value &&
    productSortSchema.safeParse(value.sort).success &&
    "view" in value &&
    (value.view === "grid" || value.view === "list")
  )
}

type ChangeOptions = {
  /** Transient edits (typing) replace the history entry; discrete ones push. Default: push. */
  replace?: boolean
  /**
   * RR scrolls to the top on every new location. Filter edits should keep the
   * scroll position (the user is working in the sidebar), page changes should reset it.
   */
  resetScroll?: boolean
}

/**
 * The URL is the ONLY store for filters: this hook derives everything from
 * `useSearchParams` and writes by calling `setSearchParams`; there is no
 * `useState` copy to drift out of sync. Every change except `page` resets the
 * page to 1 (page 7 of a different result set is meaningless).
 */
export function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  // Stretch: the last explicit sort/view becomes the default when the URL is silent.
  const [prefs, setPrefs] = useLocalStorage<ListingDefaults>(
    PREFS_KEY,
    BUILT_IN_DEFAULTS,
    isListingDefaults
  )

  const filters = useMemo(
    () => parseFilters(searchParams, prefs),
    [searchParams, prefs]
  )
  const activeCount = countActiveFilters(filters)

  /** Apply a change to the CURRENT url's filters (read from `prev`, never from a stale render). */
  const update = useCallback(
    (
      change: (current: ListingFilters) => Partial<ListingFilters>,
      { replace = false, resetScroll = false }: ChangeOptions = {}
    ) => {
      setSearchParams(
        (prev) => {
          const current = parseFilters(prev, prefs)
          const patch = change(current)
          return toSearchParams(
            { ...current, page: 1, ...patch }, // a patch may set its own page
            prefs
          )
        },
        { replace, preventScrollReset: !resetScroll }
      )
    },
    [setSearchParams, prefs]
  )

  const setFilter = useCallback(
    <K extends keyof ListingFilters>(
      key: K,
      value: ListingFilters[K],
      options?: ChangeOptions
    ) => {
      if (key === "sort" || key === "view") {
        setPrefs((p) => ({ ...p, [key]: value }))
      }
      update(() => ({ [key]: value }), {
        resetScroll: key === "page",
        ...options,
      })
    },
    [update, setPrefs]
  )

  const toggleBrand = useCallback(
    (brand: string) =>
      update((f) => ({
        brands: f.brands.includes(brand)
          ? f.brands.filter((b) => b !== brand)
          : [...f.brands, brand],
      })),
    [update]
  )

  const setPriceRange = useCallback(
    (
      minPrice: number | undefined,
      maxPrice: number | undefined,
      options?: ChangeOptions
    ) => update(() => ({ minPrice, maxPrice }), options),
    [update]
  )

  const clearAll = useCallback(
    () =>
      update(() => ({
        search: undefined,
        brands: [],
        minPrice: undefined,
        maxPrice: undefined,
        minRating: undefined,
        inStock: false,
      })),
    [update]
  )

  return {
    filters,
    setFilter,
    toggleBrand,
    setPriceRange,
    clearAll,
    activeCount,
  }
}

export type ProductFiltersApi = ReturnType<typeof useProductFilters>
