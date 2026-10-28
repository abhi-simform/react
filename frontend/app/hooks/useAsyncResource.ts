import { useEffect, useEffectEvent, useState } from "react"

import { toApiError, type ApiError } from "@/lib/api/errors"
import { isAbortError } from "@/lib/async"
import type { AsyncState } from "@/lib/asyncState"

type Settled<T> =
  | { key: string; status: "success"; data: T }
  | { key: string; status: "error"; error: ApiError }

/**
 * The hand-rolled fetch pattern from 4.2/4.3 as one reusable hook (deleted in
 * Stage 9 when TanStack Query replaces it): abort in cleanup, `loading` DERIVED
 * (the settled value remembers which request it answers), and a `reload`.
 * `key` identifies the request: when it changes, a new request starts.
 * `fetcher` is read through an Effect Event, so it may close over anything
 * without being a dependency.
 */
export function useAsyncResource<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>
): AsyncState<T> & { reload: () => void } {
  const [reloadKey, setReloadKey] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const requestKey = `${key}#${reloadKey}`
  const run = useEffectEvent((signal: AbortSignal) => fetcher(signal))

  useEffect(() => {
    const controller = new AbortController()
    run(controller.signal)
      .then((data) => setSettled({ key: requestKey, status: "success", data }))
      .catch((err: unknown) => {
        if (isAbortError(err)) return // superseded or unmounted: not a failure
        setSettled({ key: requestKey, status: "error", error: toApiError(err) })
      })
    return () => controller.abort()
  }, [requestKey])

  const reload = () => setReloadKey((k) => k + 1)

  if (settled?.key !== requestKey) return { status: "loading", reload }
  return settled.status === "success"
    ? { status: "success", data: settled.data, reload }
    : { status: "error", error: settled.error, reload }
}
