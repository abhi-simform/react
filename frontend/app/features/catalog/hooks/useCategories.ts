import { useQuery } from "@tanstack/react-query"

import { toAsyncState } from "@/lib/queryState"

import { categoryQueries } from "../queries"

/**
 * The whole tree: header menu, mobile menu, filter sidebar, 404 page and the seller form all
 * call this, and Query de-duplicates them into ONE request and ONE cache entry (the
 * hand-made module-level promise cache this replaces is gone).
 */
export const useCategoryTree = () =>
  toAsyncState(useQuery(categoryQueries.tree()))

/**
 * One category with its breadcrumb `ancestors` and `children`; 404 -> error state.
 * Without a slug (the plain /products page) the query is disabled and the data is `null`.
 */
export function useCategory(slug: string | undefined) {
  const query = useQuery({
    ...categoryQueries.detail(slug ?? ""),
    enabled: slug !== undefined,
  })
  const state = toAsyncState(query)
  // Keep the old contract: no slug -> success with `null` (nothing to look up).
  return slug === undefined
    ? { ...state, status: "success" as const, data: null }
    : state
}
