import { useQueries } from "@tanstack/react-query"

import { productQueries, type ProductDetail } from "@/features/catalog"

/**
 * Products for a list of ids (the API accepts an id or slug at `/products/:idOrSlug`; there
 * is no batch endpoint, so one query per id, run in PARALLEL by `useQueries` and each cached
 * under its own key). Failed ids are skipped. `null` = still loading.
 * (Replaces the effect + `Promise.allSettled` + abort bookkeeping version.)
 */
export function useProductsByIds(
  ids: readonly string[]
): ProductDetail[] | null {
  return useQueries({
    queries: ids.map((id) => productQueries.detail(id)),
    combine: (results) => {
      if (results.some((r) => r.isPending)) return null
      return results.flatMap((r) => (r.data ? [r.data] : []))
    },
  })
}
