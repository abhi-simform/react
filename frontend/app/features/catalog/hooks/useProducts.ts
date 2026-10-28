import { useEffect, useState } from "react"

import { toApiError } from "@/lib/api/errors"
import type { Paginated } from "@/lib/api/envelope"
import { toQueryString } from "@/lib/api/query"
import type { AsyncState } from "@/lib/asyncState"

import { getProductsByQuery } from "../api"
import type { Product, ProductQuery } from "../types"

type Settled =
  | { key: string; status: "success"; data: Paginated<Product> }
  | { key: string; status: "error"; error: ReturnType<typeof toApiError> }

/**
 * Hand-rolled fetch (deleted in Stage 9 when TanStack Query replaces it).
 *
 * `loading` is DERIVED, not stored: the stored value remembers which request
 * (`key`) it answers, and if that is not the current request we are loading.
 * That avoids calling `setState({ status: "loading" })` synchronously inside
 * the effect (which the react-hooks lint rule flags: it adds a render and a
 * stale frame).
 *
 * The dependency is the query STRING, a primitive. Depending on the `params`
 * object would re-run the effect on every render (new object each time).
 */
export function useProducts(
  params: ProductQuery
): AsyncState<Paginated<Product>> & { reload: () => void } {
  const queryString = toQueryString(params)
  // Changing this re-runs the effect: that is how "Retry" re-triggers a fetch.
  const [reloadKey, setReloadKey] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)
  const requestKey = `${queryString}#${reloadKey}`

  useEffect(() => {
    getProductsByQuery(queryString)
      .then((data) => setSettled({ key: requestKey, status: "success", data }))
      .catch((err: unknown) => {
        const error = toApiError(err)
        console.error("useProducts failed:", error.code)
        setSettled({ key: requestKey, status: "error", error })
      })
  }, [queryString, requestKey])

  const reload = () => setReloadKey((k) => k + 1)

  if (settled?.key !== requestKey) return { status: "loading", reload }
  return settled.status === "success"
    ? { status: "success", data: settled.data, reload }
    : { status: "error", error: settled.error, reload }
}
