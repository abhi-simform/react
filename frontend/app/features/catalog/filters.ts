import { z } from "zod"

import { productSortSchema } from "./schemas"
import type { ProductQuery, ProductSort } from "./types"

/**
 * URL <-> filters. The URL is a PUBLIC, user-editable store, so parsing is
 * defensive: every field has a safe fallback and nothing here can throw.
 * (Named `ListingFilters` because `ProductFilters` is the Stage 1 predicate type.)
 */
export type ListingView = "grid" | "list"
/** `pages` = classic pagination (default, URL-addressable); `more` = "load more" / infinite scroll (6.6). */
export type ListingMode = "pages" | "more"

export type ListingFilters = {
  search?: string
  brands: string[]
  minPrice?: number
  maxPrice?: number
  minRating?: number
  inStock: boolean
  sort: ProductSort
  page: number
  view: ListingView
  mode: ListingMode
}

/** Values the URL omits. The user's saved preference can override sort and view (stretch). */
export type ListingDefaults = Pick<ListingFilters, "sort" | "view">
export const BUILT_IN_DEFAULTS: ListingDefaults = {
  sort: "relevance",
  view: "grid",
}

export const PAGE_SIZE = 12
const MAX_BRANDS = 20

/** "" and missing both mean "absent" (`Number("")` would be 0, see 1.2). */
const optionalNumber = (schema: z.ZodNumber) =>
  z
    .preprocess(
      (v) => (v === "" || v == null ? undefined : v),
      z.coerce.number().pipe(schema)
    )
    .optional()
    .catch(undefined)

function filtersSchema(defaults: ListingDefaults) {
  return z.object({
    search: z.string().trim().min(1).max(100).optional().catch(undefined),
    brand: z
      .array(z.string().trim().min(1).max(60))
      .transform((list) => [...new Set(list)].slice(0, MAX_BRANDS))
      .catch([]),
    minPrice: optionalNumber(z.number().min(0).max(10_000_000)),
    maxPrice: optionalNumber(z.number().min(0).max(10_000_000)),
    minRating: optionalNumber(z.number().min(1).max(5)),
    inStock: z.preprocess((v) => v === "true", z.boolean()).catch(false),
    sort: productSortSchema.catch(defaults.sort),
    page: z.coerce.number().int().min(1).max(10_000).catch(1),
    view: z.enum(["grid", "list"]).catch(defaults.view),
    mode: z.enum(["pages", "more"]).catch("pages"),
  })
}

export function parseFilters(
  searchParams: URLSearchParams,
  defaults: ListingDefaults = BUILT_IN_DEFAULTS
): ListingFilters {
  const parsed = filtersSchema(defaults).parse({
    search: searchParams.get("search") ?? undefined,
    brand: searchParams.getAll("brand"),
    minPrice: searchParams.get("minPrice"),
    maxPrice: searchParams.get("maxPrice"),
    minRating: searchParams.get("minRating"),
    inStock: searchParams.get("inStock"),
    sort: searchParams.get("sort") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    view: searchParams.get("view") ?? undefined,
    mode: searchParams.get("mode") ?? undefined,
  })
  // A reversed range would 422 at the API: repair it instead of failing.
  const [minPrice, maxPrice] =
    parsed.minPrice !== undefined &&
    parsed.maxPrice !== undefined &&
    parsed.minPrice > parsed.maxPrice
      ? [parsed.maxPrice, parsed.minPrice]
      : [parsed.minPrice, parsed.maxPrice]
  return {
    search: parsed.search,
    brands: parsed.brand,
    minPrice,
    maxPrice,
    minRating: parsed.minRating,
    inStock: parsed.inStock,
    sort: parsed.sort,
    page: parsed.page,
    view: parsed.view,
    mode: parsed.mode,
  }
}

/** Serialise, OMITTING defaults so shared URLs stay short and clean. */
export function toSearchParams(
  filters: ListingFilters,
  defaults: ListingDefaults = BUILT_IN_DEFAULTS
): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  for (const brand of filters.brands) params.append("brand", brand)
  if (filters.minPrice !== undefined)
    params.set("minPrice", String(filters.minPrice))
  if (filters.maxPrice !== undefined)
    params.set("maxPrice", String(filters.maxPrice))
  if (filters.minRating !== undefined)
    params.set("minRating", String(filters.minRating))
  if (filters.inStock) params.set("inStock", "true")
  if (filters.sort !== defaults.sort) params.set("sort", filters.sort)
  if (filters.page !== 1) params.set("page", String(filters.page))
  if (filters.view !== defaults.view) params.set("view", filters.view)
  if (filters.mode === "more") params.set("mode", "more")
  return params
}

/** How many filters narrow the listing (sort, page and view do not count). */
export function countActiveFilters(filters: ListingFilters): number {
  return (
    filters.brands.length +
    (filters.search ? 1 : 0) +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0) +
    (filters.minRating !== undefined ? 1 : 0) +
    (filters.inStock ? 1 : 0)
  )
}

/** Filters -> the API's query (brand list becomes `brand=a,b`, see `toQueryString`). */
export function toProductQuery(
  filters: ListingFilters,
  category?: string
): ProductQuery {
  return {
    page: filters.page,
    limit: PAGE_SIZE,
    sort: filters.sort,
    search: filters.search,
    category,
    brand: filters.brands.length > 0 ? filters.brands : undefined,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minRating: filters.minRating,
    inStock: filters.inStock || undefined,
    facets: true,
  }
}
