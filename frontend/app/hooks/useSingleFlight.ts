import { useCallback, useRef } from "react"

import { useLatest } from "./useLatest"

/**
 * Wraps an async handler so a second call while the first is still running is ignored.
 * `isSubmitting` disables the BUTTON, but state is updated after the click: two clicks (or
 * Enter + click) in the same tick both see "not submitting". A ref flips immediately.
 */
export function useSingleFlight<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>
): (...args: Args) => Promise<R | undefined> {
  const running = useRef(false)
  const latest = useLatest(fn)
  return useCallback(
    async (...args: Args) => {
      if (running.current) return undefined
      running.current = true
      try {
        return await latest.current(...args)
      } finally {
        running.current = false
      }
    },
    [latest]
  )
}
