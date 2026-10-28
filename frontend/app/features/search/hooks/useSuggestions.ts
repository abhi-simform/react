import { queryOptions, useQuery } from "@tanstack/react-query"

import { getProducts } from "@/features/catalog"
import { STALE } from "@/lib/query-client"
import { searchKeys } from "@/lib/queryKeys"
import { toAsyncState } from "@/lib/queryState"

export const searchQueries = {
  suggestions: (term: string) =>
    queryOptions({
      queryKey: searchKeys.suggestions(term),
      queryFn: async ({ signal }) =>
        (await getProducts({ search: term, limit: 5 }, signal)).items,
      staleTime: STALE.catalog,
    }),
}

/**
 * Top suggestions for an (already debounced) term. Empty term = disabled (idle): no request.
 * What the hand-made `Map` cache, the abort controller and the "which query does this answer"
 * bookkeeping did is now Query's cache (typing a term you tried before is instant) and
 * automatic cancellation (the `signal` aborts when the key changes).
 */
export const useSuggestions = (term: string) =>
  toAsyncState(
    useQuery({ ...searchQueries.suggestions(term), enabled: term !== "" })
  )
