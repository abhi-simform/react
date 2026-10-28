import { useEffect, useSyncExternalStore } from "react"

/** The slice of zustand's `persist` API we use (so `lib/` does not import any feature). */
export type PersistApi = {
  rehydrate: () => Promise<void> | void
  hasHydrated: () => boolean
  onFinishHydration: (listener: () => void) => () => void
}

/**
 * Persisted stores are created with `skipHydration: true`: the SERVER (and the first client
 * render) must see the empty initial state, or the markup would differ ("Cart 0" vs "Cart 3")
 * and React would report a hydration mismatch. This hook then:
 * 1. rehydrates from localStorage once, after mount;
 * 2. rehydrates again on a `storage` event for the store's key (another tab changed the cart).
 *    The event never fires in the tab that wrote, so there is no echo, and the store writes
 *    back identical JSON, which does not fire it elsewhere either.
 */
export function useSyncPersistedStore(persist: PersistApi, key: string) {
  useEffect(() => {
    void persist.rehydrate()
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) void persist.rehydrate()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [persist, key])
}

/** `false` on the server and until the first rehydrate finished: show a skeleton, not "empty". */
export function usePersistHydrated(persist: PersistApi): boolean {
  return useSyncExternalStore(
    persist.onFinishHydration,
    persist.hasHydrated,
    () => false
  )
}
