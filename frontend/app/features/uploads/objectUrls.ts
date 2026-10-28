import { useCallback, useSyncExternalStore } from "react"

/**
 * Reference-counted `URL.createObjectURL` (7.8). An object URL keeps the File's bytes alive
 * until it is revoked or the document closes: forgetting `revokeObjectURL` leaks memory for
 * the whole session (a 2 MB photo each time a preview is shown and dropped).
 * Each component that shows a preview SUBSCRIBES to a file's URL; the first subscriber creates
 * it, the last one revokes it. React StrictMode mounts, unmounts and re-mounts effects in dev:
 * the counting makes that harmless (create, revoke, create).
 */
const urls = new Map<File, { url: string; refs: number }>()
const countListeners = new Set<() => void>()
const notifyCount = () => countListeners.forEach((l) => l())

// Dev only: `window.__liveObjectUrls` lets you check from the console that navigating away
// (unmounting every preview) brings the count back to 0.
if (import.meta.env.DEV && typeof window !== "undefined")
  Object.defineProperty(window, "__liveObjectUrls", { get: () => urls.size })

function acquire(file: File) {
  const entry = urls.get(file)
  if (entry) entry.refs++
  else urls.set(file, { url: URL.createObjectURL(file), refs: 1 })
  notifyCount()
}
function release(file: File) {
  const entry = urls.get(file)
  if (!entry) return
  if (--entry.refs === 0) {
    URL.revokeObjectURL(entry.url)
    urls.delete(file)
  }
  notifyCount()
}

/**
 * The preview URL for `file`, or `undefined` for the first render before the subscription exists.
 * `subscribe` MUST be stable per file (useCallback): a new function every render makes React
 * unsubscribe and resubscribe on each render, and release/acquire notifications then
 * re-render the component again: an infinite loop (I hit exactly that).
 */
export function useObjectUrl(file: File): string | undefined {
  const subscribe = useCallback(() => {
    acquire(file)
    return () => release(file)
  }, [file])
  // After subscribing React re-reads the snapshot, which now has the URL: no manual notify needed.
  return useSyncExternalStore(
    subscribe,
    () => urls.get(file)?.url,
    () => undefined
  )
}

const subscribeCount = (listener: () => void) => {
  countListeners.add(listener)
  return () => {
    countListeners.delete(listener)
  }
}

/** Dev counter: how many object URLs are alive right now (must go back to 0 when previews go away). */
export function useLiveObjectUrlCount(): number {
  return useSyncExternalStore(
    subscribeCount,
    () => urls.size,
    () => 0
  )
}
