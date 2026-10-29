import type {
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table"
import { z } from "zod"

// Shared search-param pieces: the URL is the table's state (reload, back/forward and shared links
// all work), the API query is derived from it, the table only displays it.
export const pagingSearch = {
  page: z.coerce.number().int().min(1).default(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20).catch(20),
  order: z.enum(["asc", "desc"]).default("desc").catch("desc"),
}

type Paging = {
  page: number
  pageSize: number
  sort: string
  order: "asc" | "desc"
}

export const toSorting = (s: Pick<Paging, "sort" | "order">): SortingState => [
  { id: s.sort, desc: s.order === "desc" },
]
export const toPagination = (
  s: Pick<Paging, "page" | "pageSize">
): PaginationState => ({
  pageIndex: s.page - 1,
  pageSize: s.pageSize,
})

/**
 * Adapters from TanStack Table's `onSortingChange` / `onPaginationChange` (which pass a value OR
 * an updater function) to a `navigate({ search })` patch. Changing the sort or the page size goes
 * back to page 1; a filter change does the same in the screens (otherwise page 7 of the old
 * result set may not exist any more).
 */
export function tableHandlers<TPaging extends Paging>(
  current: TPaging,
  patch: (
    p: Partial<Pick<TPaging, "sort" | "order" | "page" | "pageSize">>
  ) => void
): {
  onSortingChange: OnChangeFn<SortingState>
  onPaginationChange: OnChangeFn<PaginationState>
} {
  return {
    onSortingChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(toSorting(current)) : updater
      const first = next.at(0)
      if (first)
        patch({
          sort: first.id,
          order: first.desc ? "desc" : "asc",
          page: 1,
        })
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(toPagination(current)) : updater
      patch({
        page: next.pageIndex + 1,
        pageSize: next.pageSize,
        ...(next.pageSize !== current.pageSize ? { page: 1 } : {}),
      })
    },
  }
}
