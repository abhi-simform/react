import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router"

import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { NotFoundError } from "@/lib/notFound"
import { paths } from "@/lib/paths"

import { toProductQuery } from "../filters"
import { useCategory } from "../hooks/useCategories"
import { useProductFilters } from "../hooks/useProductFilters"
import { useInfiniteProducts } from "../hooks/useInfiniteProducts"
import { useProducts } from "../hooks/useProducts"
import type { Facets } from "../types"
import { ActiveFilterChips } from "./ActiveFilterChips"
import { FilterSidebar } from "./FilterSidebar"
import { Pagination } from "./Pagination"
import { FiltersSheet } from "./FiltersSheet"
import { InfiniteResults } from "./InfiniteResults"
import { ListingResults } from "./ListingResults"
import { SortSelect } from "./SortSelect"

/**
 * /products and /c/:categorySlug are the same page: the category is a preset,
 * everything else lives in the URL (see `useProductFilters`).
 */
export function ProductListingPage({
  categorySlug,
}: {
  categorySlug?: string
}) {
  const api = useProductFilters()
  const { filters, setFilter, activeCount } = api
  // Two ways to browse the same result set; only the active one makes requests.
  const moreMode = filters.mode === "more"
  const query = toProductQuery(filters, categorySlug)
  const state = useProducts(query, !moreMode)
  const infinite = useInfiniteProducts(query, moreMode)
  const category = useCategory(categorySlug)
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Keep the last facets while the next request is in flight so the sidebar does not blank out.
  // (Adjusting state during render, guarded by a condition, is the sanctioned "derive from props" escape hatch.)
  const latestFacets = moreMode
    ? infinite.facets
    : state.status === "success"
      ? state.data.meta.facets
      : undefined
  const [facets, setFacets] = useState<Facets>()
  if (latestFacets && latestFacets !== facets) setFacets(latestFacets)

  const categoryName =
    category.status === "success" ? category.data?.name : undefined
  const title = categorySlug
    ? (categoryName ?? "Category")
    : filters.search
      ? `Results for "${filters.search}"`
      : "All products"

  const meta = state.status === "success" ? state.data.meta : undefined
  const total = moreMode
    ? infinite.status === "loading-first" || infinite.status === "error-first"
      ? undefined
      : infinite.total
    : meta?.total
  useDocumentTitle(
    categorySlug
      ? (categoryName ?? "Category")
      : filters.search
        ? `Search: ${filters.search}`
        : "Products"
  )

  function removeCategory() {
    const rest = new URLSearchParams(searchParams)
    rest.delete("page")
    navigate({ pathname: paths.products(), search: rest.toString() })
  }

  if (
    categorySlug &&
    category.status === "error" &&
    category.error.status === 404
  )
    throw new NotFoundError("Category", categorySlug)

  const sidebar = (
    <FilterSidebar categorySlug={categorySlug} facets={facets} api={api} />
  )

  return (
    <div>
      {category.status === "success" && category.data && (
        <Breadcrumbs
          trail={[
            ...category.data.ancestors.map((a) => ({
              label: a.name,
              to: paths.category(a.slug),
            })),
            { label: category.data.name },
          ]}
        />
      )}
      <div className="p-4">
        <h1 className="mb-3 text-xl font-medium">{title}</h1>
        <div className="flex gap-6">
          {isDesktop && (
            <aside aria-label="Filters" className="w-60 shrink-0">
              {sidebar}
            </aside>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {!isDesktop && (
                  <FiltersSheet activeCount={activeCount} total={total}>
                    {sidebar}
                  </FiltersSheet>
                )}
                <p role="status" aria-live="polite" className="text-sm">
                  {total !== undefined
                    ? `${total.toLocaleString("en-IN")} products`
                    : "Loading..."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <SortSelect
                  value={filters.sort}
                  onChange={(s) => setFilter("sort", s)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  aria-pressed={filters.view === "list"}
                  onClick={() =>
                    setFilter("view", filters.view === "grid" ? "list" : "grid")
                  }
                >
                  {filters.view === "grid" ? "List view" : "Grid view"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-pressed={moreMode}
                  onClick={() => setFilter("mode", moreMode ? "pages" : "more")}
                >
                  {moreMode ? "Use pages" : "Load more mode"}
                </Button>
              </div>
            </div>
            <ActiveFilterChips
              filters={filters}
              categoryName={categoryName}
              onRemoveCategory={categorySlug ? removeCategory : undefined}
              onToggleBrand={api.toggleBrand}
              onSetPriceRange={(min, max) => api.setPriceRange(min, max)}
              onSetFilter={setFilter}
              onClearAll={api.clearAll}
            />
            {moreMode ? (
              <InfiniteResults
                list={infinite}
                filters={filters}
                activeCount={activeCount}
                onClearAll={api.clearAll}
              />
            ) : (
              <ListingResults
                state={state}
                filters={filters}
                activeCount={activeCount}
                onGoToPage={(page) => setFilter("page", page)}
                onClearAll={api.clearAll}
              />
            )}
            {!moreMode && meta && (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                onPageChange={(p) => setFilter("page", p)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
