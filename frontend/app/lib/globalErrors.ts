import { reportError } from "@/lib/report"

/**
 * The errors no boundary can catch (12.8): an exception in an event handler or a timer
 * (`window.onerror`) and a promise nobody awaited (`unhandledrejection`). Each is reported ONCE:
 * the same error object seen twice (two listeners, a re-dispatch) is ignored, and the install is
 * undone by the returned function, so React StrictMode's mount/unmount/mount leaves one pair.
 * A caller's own abort is not an error.
 */
export function installGlobalErrorReporting(): () => void {
  const seen = new WeakSet<object>()
  const once = (reason: unknown, context: string) => {
    if (typeof reason === "object" && reason !== null) {
      if ((reason as { name?: string }).name === "AbortError") return
      if (seen.has(reason)) return
      seen.add(reason)
    }
    reportError(reason, context)
  }
  const onError = (event: ErrorEvent) =>
    once(event.error ?? event.message, "window.onerror")
  const onRejection = (event: PromiseRejectionEvent) =>
    once(event.reason, "unhandledrejection")

  window.addEventListener("error", onError)
  window.addEventListener("unhandledrejection", onRejection)
  return () => {
    window.removeEventListener("error", onError)
    window.removeEventListener("unhandledrejection", onRejection)
  }
}
