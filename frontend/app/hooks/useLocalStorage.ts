import { useCallback, useMemo, useState, useSyncExternalStore } from "react"

/**
 * localStorage as an external store.
 * - Values are JSON; a corrupt or wrongly-shaped value falls back to `initial`.
 * - Storage can throw (quota, private mode, blocked): we fall back to memory.
 * - `storage` events sync other tabs; the same-tab change event covers this tab
 *   (the browser does NOT fire `storage` in the tab that wrote).
 * - `typeof window` guards keep it safe where there is no browser (SSR/tests).
 */
const SAME_TAB_EVENT = "local-storage"
const memory = new Map<string, string>()

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return memory.get(key) ?? null
  }
}

function writeRaw(key: string, raw: string | null) {
  try {
    if (raw === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, raw)
  } catch {
    if (raw === null) memory.delete(key)
    else memory.set(key, raw)
  }
  window.dispatchEvent(new CustomEvent(SAME_TAB_EVENT, { detail: key }))
}

function subscribe(key: string, listener: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) listener() // null = storage.clear()
  }
  const onSameTab = (e: Event) => {
    if ((e as CustomEvent<string>).detail === key) listener()
  }
  window.addEventListener("storage", onStorage)
  window.addEventListener(SAME_TAB_EVENT, onSameTab)
  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(SAME_TAB_EVENT, onSameTab)
  }
}

function parse<T>(
  raw: string | null,
  fallback: T,
  validate?: (value: unknown) => value is T
): T {
  if (raw === null) return fallback
  try {
    const value: unknown = JSON.parse(raw)
    if (validate && !validate(value)) return fallback
    // Without a validator the type is the caller's claim (as with `request<T>`).
    return value as T
  } catch {
    return fallback
  }
}

export function useLocalStorage<T>(
  key: string,
  initial: T,
  /** Pass one for data you don't fully trust: anything else falls back to `initial`. */
  validate?: (value: unknown) => value is T
): [
  value: T,
  setValue: (next: T | ((prev: T) => T)) => void,
  remove: () => void,
] {
  // Freeze `initial` so an inline `[]` does not change identity every render.
  const [fallback] = useState(initial)

  // The snapshot is the raw STRING: strings compare by value, so React sees "no
  // change" until the stored text really changes (an object would be a new
  // reference on every read and loop forever).
  const raw = useSyncExternalStore(
    useCallback((listener: () => void) => subscribe(key, listener), [key]),
    () => readRaw(key),
    () => null
  )
  const value = useMemo(
    () => parse(raw, fallback, validate),
    [raw, fallback, validate]
  )

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = parse(readRaw(key), fallback, validate)
      const resolved =
        typeof next === "function" ? (next as (prev: T) => T)(prev) : next
      writeRaw(key, JSON.stringify(resolved))
    },
    [key, fallback, validate]
  )
  const remove = useCallback(() => writeRaw(key, null), [key])

  return [value, setValue, remove]
}
