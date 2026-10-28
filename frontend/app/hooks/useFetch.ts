import { useCallback, useEffect, useEffectEvent, useState } from "react"

import { toApiError, type ApiError } from "@/lib/api/errors"
import { isAbortError } from "@/lib/async"
import type { AsyncState } from "@/lib/asyncState"

type Settled<T> =
  | { deps: string; request: number; status: "success"; data: T }
  | { deps: string; request: number; status: "error"; error: ApiError }

type Options = {
  /** `false` = do not request (state stays "idle"). E.g. wait for a user id. */
  enabled?: boolean
  /**
   * When the DEPENDENCIES change, keep showing the previous data (marked `isRefreshing`)
   * instead of dropping to the skeleton. `reload()` always keeps the data.
   */
  keepPrevious?: boolean
}

export type FetchResult<T> = AsyncState<T> & {
  /** Run the request again. Success data stays visible meanwhile (`isRefreshing`). */
  reload: () => void
  /** Patch the loaded data locally (a mutation's response, an optimistic change). No request. */
  setData: (update: (previous: T) => T) => void
  isRefreshing: boolean
}

/**
 * The generic version of the hand-rolled fetch pattern (6.8): `AsyncState<T>`, abort on
 * dependency change and unmount, `reload`, `enabled`, and local patching.
 *
 * `deps` is serialised to ONE string key (`JSON.stringify`), so callers can pass objects
 * and arrays inline without creating an effect loop, and every dependency must be JSON-able.
 * `fetcher` is read through an Effect Event: it may close over anything, but changing it
 * does NOT refetch, only `deps` do (that is the contract: list what the request depends on).
 *
 * WHAT IT STILL CANNOT DO (the point of Stage 9; see docs/pain-journal.md): share results
 * between components, de-duplicate identical requests, cache, retry, refetch on focus or
 * reconnect, invalidate after a mutation, or show up in devtools.
 */
export function useFetch<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
  { enabled = true, keepPrevious = false }: Options = {}
): FetchResult<T> {
  const key = JSON.stringify(deps)
  const [request, setRequest] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const run = useEffectEvent((signal: AbortSignal) => fetcher(signal))

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    run(controller.signal)
      .then((data) =>
        setSettled({ deps: key, request, status: "success", data })
      )
      .catch((err: unknown) => {
        if (isAbortError(err)) return // superseded or unmounted: not a failure
        setSettled({
          deps: key,
          request,
          status: "error",
          error: toApiError(err),
        })
      })
    return () => controller.abort()
  }, [key, request, enabled])

  const reload = useCallback(() => setRequest((n) => n + 1), [])
  const setData = useCallback((update: (previous: T) => T) => {
    setSettled((current) =>
      current?.status === "success"
        ? { ...current, data: update(current.data) }
        : current
    )
  }, [])

  if (!enabled) return { status: "idle", reload, setData, isRefreshing: false }

  // Does the settled result answer THIS request? (loading is derived, never stored)
  const current = settled?.deps === key && settled.request === request
  if (settled && current) {
    return settled.status === "success"
      ? {
          status: "success",
          data: settled.data,
          reload,
          setData,
          isRefreshing: false,
        }
      : {
          status: "error",
          error: settled.error,
          reload,
          setData,
          isRefreshing: false,
        }
  }
  // Not settled for this request yet: show the old data if allowed, else loading.
  if (settled?.status === "success" && (keepPrevious || settled.deps === key)) {
    return {
      status: "success",
      data: settled.data,
      reload,
      setData,
      isRefreshing: true,
    }
  }
  return { status: "loading", reload, setData, isRefreshing: false }
}
