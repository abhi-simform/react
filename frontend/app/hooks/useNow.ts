import { useCallback, useSyncExternalStore } from "react"

/**
 * One shared clock per tick length. Five countdowns on a page subscribe to the
 * same `setInterval` instead of owning five. The interval exists only while
 * somebody is subscribed, and a subscriber can ask to be dropped after
 * `stopAt` (a deal that has ended needs no more ticks).
 *
 * This is an EXTERNAL STORE, hence `useSyncExternalStore` rather than
 * `useState` + `useEffect`: it is tear-free (every component in one render
 * sees the same `now`) and it has no "set state in an effect" step.
 */
type Store = {
  now: number
  listeners: Set<() => void>
  timer?: ReturnType<typeof setInterval>
  onVisible?: () => void
}

const stores = new Map<number, Store>()

function getStore(tickMs: number): Store {
  let store = stores.get(tickMs)
  if (!store) {
    store = { now: Date.now(), listeners: new Set() }
    stores.set(tickMs, store)
  }
  return store
}

function tick(store: Store) {
  store.now = Date.now()
  for (const listener of [...store.listeners]) listener()
}

function subscribe(
  tickMs: number,
  listener: () => void,
  stopAt: number | undefined
): () => void {
  // Already over: nothing to subscribe to, so no timer is ever created.
  if (stopAt !== undefined && Date.now() >= stopAt) return () => {}

  const store = getStore(tickMs)
  const wrapped = () => {
    listener()
    if (stopAt !== undefined && store.now >= stopAt) unsubscribe()
  }
  function unsubscribe() {
    if (!store.listeners.delete(wrapped)) return
    if (store.listeners.size === 0) {
      clearInterval(store.timer)
      store.timer = undefined
      if (store.onVisible)
        document.removeEventListener("visibilitychange", store.onVisible)
      store.onVisible = undefined
    }
  }

  store.listeners.add(wrapped)
  if (store.listeners.size === 1) {
    store.now = Date.now()
    store.timer = setInterval(() => tick(store), tickMs)
    // Background tabs throttle timers: refresh the moment the tab is visible
    // again (the value is computed from Date.now(), so it is exact, only late).
    store.onVisible = () => {
      if (document.visibilityState === "visible") tick(store)
    }
    document.addEventListener("visibilitychange", store.onVisible)
  }
  return unsubscribe
}

/** How many shared intervals are running right now (for demos and tests). */
export function activeNowTimers(): number {
  let count = 0
  for (const store of stores.values()) if (store.timer !== undefined) count++
  return count
}

/** `Date.now()` as of the latest tick, re-rendering the caller every `tickMs`. */
export function useNow(tickMs = 1000, stopAt?: number): number {
  const sub = useCallback(
    (listener: () => void) => subscribe(tickMs, listener, stopAt),
    [tickMs, stopAt]
  )
  return useSyncExternalStore(
    sub,
    () => getStore(tickMs).now,
    () => Date.now() // server snapshot (unused in SPA mode, required signature)
  )
}
