import { useCallback, useSyncExternalStore } from "react"

/** Live `matchMedia`: re-renders when the query starts/stops matching. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (listener: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", listener)
      return () => mql.removeEventListener("change", listener)
    },
    [query]
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false // no window on a server: assume "does not match"
  )
}
