import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { STALE } from "@/lib/query-client"
import { searchKeys } from "@/lib/queryKeys"

import { getSuggestions } from "./search.api"

export const searchQueries = {
  /**
   * The key holds the NORMALISED, already debounced term. `signal` aborts the request when the key
   * changes (typing on), a repeat of a cached term is answered from memory (no request inside
   * `staleTime`), and `placeholderData: keepPreviousData` keeps the previous list on screen while
   * the next term loads, so the dropdown never flickers between keystrokes.
   */
  suggestions: (term: string) =>
    queryOptions({
      queryKey: searchKeys.suggestions(term),
      queryFn: ({ signal }) => getSuggestions(term, signal),
      staleTime: STALE.catalog,
      placeholderData: keepPreviousData,
    }),
}
