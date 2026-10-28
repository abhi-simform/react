import { useEffect, useEffectEvent, useReducer, useRef } from "react"

import { toApiError, type ApiError } from "@/lib/api/errors"
import type { Paginated } from "@/lib/api/envelope"
import { toQueryString } from "@/lib/api/query"
import { isAbortError } from "@/lib/async"
import { useLatest } from "@/hooks/useLatest"

import { getProductsByQuery } from "../api"
import type { Facets, Product, ProductListMeta, ProductQuery } from "../types"

/**
 * "Load more" list (6.6), by hand. The list belongs to ONE filter set, identified by `key`
 * (the query string without `page`). Everything a response does is tagged with the key AND
 * the page it answers; the reducer ignores anything that no longer matches. That is what
 * guarantees old and new results never mix when a filter changes while page 3 is loading.
 * (Aborting the request is the polite half; the key check is the safe half.)
 */
type State = {
  key: string
  items: Product[]
  /** Next page to request. */
  nextPage: number
  total: number
  hasNext: boolean
  facets?: Facets
  /** first = initial load, more = a later page. `error-more` keeps the pages already loaded. */
  status:
    "loading-first" | "idle" | "loading-more" | "error-first" | "error-more"
  error: ApiError | null
}

const fresh = (key: string): State => ({
  key,
  items: [],
  nextPage: 1,
  total: 0,
  hasNext: false,
  status: "loading-first",
  error: null,
})

type Action =
  | {
      type: "page-loaded"
      key: string
      page: number
      result: Paginated<Product, ProductListMeta>
    }
  | { type: "page-failed"; key: string; page: number; error: ApiError }
  | { type: "more-started"; key: string }
  | { type: "reset"; key: string }

function reducer(state: State, action: Action): State {
  // Starting over (new filters, or retrying the first page) is the only action that may change the key.
  if (action.type === "reset") return fresh(action.key)
  if (action.key !== state.key) return state // a stale answer for an old filter set
  switch (action.type) {
    case "more-started":
      return { ...state, status: "loading-more", error: null }
    case "page-loaded": {
      if (action.page !== state.nextPage) return state // duplicate or out-of-order page
      const seen = new Set(state.items.map((p) => p._id))
      // Dedupe by id: a product inserted while scrolling shifts later pages by one.
      const added = action.result.items.filter((p) => !seen.has(p._id))
      return {
        ...state,
        items: [...state.items, ...added],
        nextPage: action.page + 1,
        total: action.result.meta.total,
        hasNext: action.result.meta.hasNext,
        facets: action.result.meta.facets ?? state.facets,
        status: "idle",
        error: null,
      }
    }
    case "page-failed":
      if (action.page !== state.nextPage) return state
      return {
        ...state,
        status: action.page === 1 ? "error-first" : "error-more",
        error: action.error,
      }
  }
}

export function useInfiniteProducts(
  query: Omit<ProductQuery, "page">,
  enabled = true
) {
  // The key is a primitive built from the query (no `page`): see useProducts.
  const key = toQueryString({ ...query, page: undefined })
  const [stored, dispatch] = useReducer(reducer, key, fresh)
  // Derived: if the filters changed, the stored list is for the OLD key, so we are at "loading first" again.
  const state = stored.key === key ? stored : fresh(key)
  const controller = useRef<AbortController | null>(null)
  const busy = useRef(false) // "a request is in flight": blocks duplicate triggers (fast scrolling)

  // `query` is a new object every render; callbacks read the latest one through a ref instead of depending on it.
  const latestQuery = useLatest(query)

  // Plain functions on purpose: React Compiler memoizes them, and the effect below reads
  // `load` through an Effect Event so it is not a dependency.
  function load(page: number) {
    if (busy.current) return
    busy.current = true
    const own = new AbortController()
    controller.current = own
    const q = latestQuery.current
    getProductsByQuery(
      // Facets only come with page 1; later pages skip the extra aggregations.
      toQueryString({ ...q, page, facets: page === 1 ? q.facets : undefined }),
      own.signal
    )
      .then((result) => dispatch({ type: "page-loaded", key, page, result }))
      .catch((err: unknown) => {
        if (isAbortError(err)) return
        dispatch({ type: "page-failed", key, page, error: toApiError(err) })
      })
      .finally(() => {
        // Only the request that is still current may release the flag.
        if (controller.current === own) busy.current = false
      })
  }

  const startOver = useEffectEvent(() => {
    busy.current = false
    dispatch({ type: "reset", key })
    load(1)
  })

  // A new key = a new list: abort whatever was in flight and load page 1.
  useEffect(() => {
    if (!enabled) return
    startOver()
    return () => {
      controller.current?.abort()
      busy.current = false
    }
  }, [enabled, key])

  function loadMore() {
    if (!enabled || !state.hasNext) return
    if (state.status !== "idle" && state.status !== "error-more") return
    dispatch({ type: "more-started", key })
    load(state.nextPage)
  }

  function retryFirst() {
    dispatch({ type: "reset", key })
    busy.current = false
    load(1)
  }

  return { ...state, loadMore, retryFirst }
}
