import { useQuery } from "@tanstack/react-query"

import { MIN_TERM } from "../term"
import { searchQueries } from "../queries"

/**
 * Suggestions for an (already debounced, normalised) term. Under MIN_TERM characters the query is
 * disabled: no request, no data. `isPlaceholderData` = what is shown belongs to the PREVIOUS term.
 */
export const useSuggestions = (term: string) =>
  useQuery({
    ...searchQueries.suggestions(term),
    enabled: term.length >= MIN_TERM,
  })
