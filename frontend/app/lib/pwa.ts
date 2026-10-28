/**
 * PWA plumbing (13.10): registering the service worker, noticing that a NEW version is waiting, applying it,
 * and capturing the browser's install prompt. Framework-free stores so React can subscribe with
 * `useSyncExternalStore` (see features/pwa). Production only: `vite dev` has no sw.js, and a service worker
 * on a dev server is how people end up debugging stale code for an afternoon.
 */
let waiting: ServiceWorker | null = null
let installEvent: BeforeInstallPromptEvent | null = null
let applying = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
export const subscribePwa = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const isUpdateWaiting = () => waiting !== null
export const canInstall = () => installEvent !== null

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function setWaiting(worker: ServiceWorker | null) {
  waiting = worker
  emit()
}

let registered = false
export function registerServiceWorker() {
  if (registered || !("serviceWorker" in navigator)) return
  registered = true // StrictMode runs effects twice; listeners must be added once
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault() // keep the event: we show our own button instead of the mini-infobar
    installEvent = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener("appinstalled", () => {
    installEvent = null
    emit()
  })
  if (!import.meta.env.PROD) return

  const register = () =>
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // A new worker only counts as an UPDATE when an old one is already controlling the page
        // (on the very first visit "installed" just means "the app can now work offline").
        const watch = (worker: ServiceWorker) =>
          worker.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            )
              setWaiting(worker)
          })
        if (registration.waiting && navigator.serviceWorker.controller)
          setWaiting(registration.waiting)
        registration.addEventListener("updatefound", () => {
          if (registration.installing) watch(registration.installing)
        })
        // Long-lived tabs: look for a new version whenever the tab comes back to the front.
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible")
            void registration.update().catch(() => undefined)
        })
      })
      .catch(() => undefined) // no service worker is a degraded experience, not an error
  if (document.readyState === "complete") void register()
  else window.addEventListener("load", () => void register(), { once: true })

  // Reload ONLY after the user pressed "Reload" (the first install also changes the controller: no reload then).
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (applying) location.reload()
  })
}

/** The user chose "Reload": let the waiting worker take over; the page reloads when it has. */
export function applyUpdate() {
  if (!waiting) return
  applying = true
  waiting.postMessage({ type: "SKIP_WAITING" })
}

export async function promptInstall() {
  const event = installEvent
  if (!event) return
  await event.prompt()
  await event.userChoice
  installEvent = null
  emit()
}
