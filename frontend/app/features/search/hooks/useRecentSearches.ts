import { useCallback } from "react"

import { useLocalStorage } from "@/hooks/useLocalStorage"

import { addRecent, isTermList, RECENT_SEARCH_KEY } from "../recentSearches"

/** Recent searches in localStorage (shared with other tabs through `useLocalStorage`). */
export function useRecentSearches() {
  const [recent, setRecent, clear] = useLocalStorage<string[]>(
    RECENT_SEARCH_KEY,
    [],
    isTermList
  )
  const add = useCallback(
    (term: string) => setRecent((prev) => addRecent(prev, term)),
    [setRecent]
  )
  return { recent, add, clear }
}
