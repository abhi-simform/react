import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Returns `value` only after it has stopped changing for `delayMs`.
 * Debounce the VALUE (not the request function): the value is plain state, so
 * the effect that depends on the debounced value runs once per pause, and it
 * works with any effect. Each call site gets its own state and timer: a hook
 * shares logic, not state.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    // Runs before the next effect and on unmount: the pending update dies.
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

/**
 * The imperative twin: returns a stable function that runs `fn` once, `delayMs`
 * after the LAST call. Useful for "fire an event/analytics call" handlers; the
 * search box does not use it because it needs a debounced *value* to drive a
 * request effect (and its cleanup).
 */
export function useDebouncedCallback<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number
): (...args: Args) => void {
  const latestFn = useRef(fn)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    latestFn.current = fn // always call the newest callback, never a stale one
  })
  useEffect(() => () => clearTimeout(timer.current), [])

  return useCallback(
    (...args: Args) => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => latestFn.current(...args), delayMs)
    },
    [delayMs]
  )
}
