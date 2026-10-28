import { useEffect, useState } from "react"

import { getProducts, type Product } from "@/features/catalog"
import { toApiError } from "@/lib/api/errors"
import { isAbortError } from "@/lib/async"
import type { AsyncState } from "@/lib/asyncState"

type Settled =
  | { query: string; status: "success"; data: Product[] }
  | { query: string; status: "error"; error: ReturnType<typeof toApiError> }

/**
 * A tiny client cache. It makes repeated queries instant and is also a lesson:
 * I am now responsible for staleness, size limits and invalidation, which is
 * exactly what TanStack Query (Stage 9) does for us, so this stays a toy.
 */
const cache = new Map<string, Product[]>()

/**
 * Top suggestions for an (already debounced) query. Empty query = idle: no
 * request is sent. Cleanup aborts the in-flight request when the query
 * changes, so the displayed list always belongs to the latest query.
 */
export function useSuggestions(query: string): AsyncState<Product[]> {
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    if (!query) return
    const controller = new AbortController()
    const cached = cache.get(query)
    const result = cached
      ? Promise.resolve(cached)
      : getProducts({ search: query, limit: 5 }, controller.signal).then(
          (page) => {
            cache.set(query, page.items)
            return page.items
          }
        )
    result
      .then((data) => setSettled({ query, status: "success", data }))
      .catch((err: unknown) => {
        if (isAbortError(err)) return // superseded: the newer query answers
        setSettled({ query, status: "error", error: toApiError(err) })
      })
    return () => controller.abort()
  }, [query])

  if (!query) return { status: "idle" }
  if (settled?.query !== query) return { status: "loading" }
  return settled.status === "success"
    ? { status: "success", data: settled.data }
    : { status: "error", error: settled.error }
}
