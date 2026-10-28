import { SlidersHorizontal } from "lucide-react"
import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { assertNever } from "@/lib/assert"
import { NotFoundError } from "@/lib/notFound"
import { paths } from "@/lib/paths"

import { PAGE_SIZE, toProductQuery } from "../filters"
import { useCategory } from "../hooks/useCategories"
import { useProductFilters } from "../hooks/useProductFilters"
import { useProducts } from "../hooks/useProducts"
import type { Facets } from "../types"
import { ActiveFilterChips } from "./ActiveFilterChips"
import { FilterSidebar } from "./FilterSidebar"
import { Pagination } from "./Pagination"
import { ProductCardSkeleton } from "./ProductCardSkeleton"
import { ProductGrid } from "./ProductGrid"
import { SortSelect } from "./SortSelect"

const gridClass = "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4"

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
  const state = useProducts(toProductQuery(filters, categorySlug))
  const category = useCategory(categorySlug)
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Keep the last facets while the next request is in flight so the sidebar does not blank out.
  // (Adjusting state during render, guarded by a condition, is the sanctioned "derive from props" escape hatch.)
  const [facets, setFacets] = useState<Facets>()
  if (
    state.status === "success" &&
    state.data.meta.facets &&
    state.data.meta.facets !== facets
  ) {
    setFacets(state.data.meta.facets)
  }

  const categoryName =
    category.status === "success" ? category.data?.name : undefined
  const title = categorySlug
    ? (categoryName ?? "Category")
    : filters.search
      ? `Results for "${filters.search}"`
      : "All products"

  const meta = state.status === "success" ? state.data.meta : undefined

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

  function body() {
    switch (state.status) {
      case "idle":
      case "loading":
        return (
          <ul
            className={gridClass}
            aria-busy="true"
            aria-label="Loading products"
          >
            {Array.from({ length: PAGE_SIZE }, (_, i) => (
              <li key={i}>
                <ProductCardSkeleton />
              </li>
            ))}
          </ul>
        )
      case "error":
        return <ErrorState error={state.error} onRetry={state.reload} />
      case "success":
        if (state.data.items.length > 0)
          return <ProductGrid products={state.data.items} view={filters.view} />
        return filters.page > 1 ? (
          <EmptyState title={`Page ${filters.page} does not exist`}>
            <Button variant="outline" onClick={() => setFilter("page", 1)}>
              Go to page 1
            </Button>
          </EmptyState>
        ) : (
          <EmptyState title="No products match these filters">
            {activeCount > 0 && (
              <Button variant="outline" onClick={api.clearAll}>
                Clear all filters
              </Button>
            )}
          </EmptyState>
        )
      default:
        return assertNever(state)
    }
  }

  const sidebar = (
    <FilterSidebar categorySlug={categorySlug} facets={facets} api={api} />
  )

  return (
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
                <Sheet>
                  <SheetTrigger render={<Button variant="outline" size="sm" />}>
                    <SlidersHorizontal aria-hidden className="size-4" />
                    Filters{activeCount > 0 ? ` (${activeCount})` : ""}
                  </SheetTrigger>
                  <SheetContent side="left" className="overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <div className="p-4">{sidebar}</div>
                    <div className="p-4">
                      <SheetClose render={<Button className="w-full" />}>
                        Show {meta ? meta.total : ""} results
                      </SheetClose>
                    </div>
                  </SheetContent>
                </Sheet>
              )}
              <p role="status" aria-live="polite" className="text-sm">
                {meta
                  ? `${meta.total.toLocaleString("en-IN")} products`
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
          {body()}
          {meta && (
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              onPageChange={(p) => setFilter("page", p)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
