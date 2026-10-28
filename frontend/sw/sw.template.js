/* ShopSphere service worker (13.10). Hand-written (no Workbox): ~100 lines, every rule is visible.
 * `scripts/build-sw.mjs` fills the three __PLACEHOLDERS__ after `react-router build` and writes build/client/sw.js.
 *
 * What it caches, and what it must NEVER cache:
 *   precache     the app shell (index + SPA fallback HTML, hashed JS/CSS/fonts): the app opens offline.
 *   CacheFirst   /assets/* (immutable, content-hashed) and product images (bounded to 80 entries).
 *   SWR          PUBLIC catalog GETs only: an allow-list of paths, no Authorization / cart-token header, AND the
 *                response must say `Cache-Control: public` (the API's own "this is shareable" marker, B12).
 *   NOTHING ELSE the SW does not call respondWith() for it: auth, cart, orders, me, payments, notifications,
 *                every POST/PUT/DELETE go straight to the network, exactly as without a service worker.
 */
const VERSION = "__VERSION__"
const API_ORIGIN = "__API_ORIGIN__"
const PRECACHE_URLS = __PRECACHE_URLS__

const SHELL = `shell-${VERSION}`
const IMAGES = "images-v1"
const API = "api-public-v1"
const KEEP = [SHELL, IMAGES, API]
const PUBLIC_API = new RegExp(`^${API_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/api/v1/(products|categories|brands|banners|config|deals|time)(/|\\?|$)`)
const MAX_IMAGES = 80

self.addEventListener("install", (event) => {
  // No skipWaiting(): a new version WAITS until the page says so (the "Reload" button), so a tab that is
  // in the middle of checkout never has its JavaScript swapped under it.
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(PRECACHE_URLS)))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) if (!KEEP.includes(name)) await caches.delete(name)
      await self.clients.claim()
    })()
  )
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting()
})

const isPrivate = (req) => req.headers.has("authorization") || req.headers.has("x-cart-token")

async function trimImages() {
  const cache = await caches.open(IMAGES)
  const keys = await cache.keys()
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_IMAGES))) await cache.delete(k)
}

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET" || isPrivate(req)) return // never touch writes or credentials
  const url = new URL(req.url)

  // Navigations: network first (fresh HTML), the cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(SHELL)
        return (
          (await cache.match(url.pathname)) ||
          (await cache.match("/__spa-fallback.html")) ||
          (await cache.match("/")) ||
          Response.error()
        )
      })
    )
    return
  }

  // Hashed build assets: never change for a given URL.
  if (url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) caches.open(SHELL).then((c) => c.put(req, res.clone()))
        return res
      }))
    )
    return
  }

  // Images (the seed's picsum URLs are cross-origin and opaque: they can be cached, not inspected).
  if (req.destination === "image") {
    event.respondWith(
      caches.open(IMAGES).then(async (cache) => {
        const hit = await cache.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok || res.type === "opaque") {
          cache.put(req, res.clone()).then(trimImages)
        }
        return res
      })
    )
    return
  }

  // Public catalog data: stale-while-revalidate, only if the SERVER marked the response public.
  if (PUBLIC_API.test(req.url)) {
    event.respondWith(
      caches.open(API).then(async (cache) => {
        const cached = await cache.match(req)
        const refresh = fetch(req).then((res) => {
          const cc = res.headers.get("cache-control") || ""
          if (res.ok && /\bpublic\b/.test(cc)) cache.put(req, res.clone())
          return res
        })
        if (cached) {
          refresh.catch(() => undefined) // revalidate in the background; offline is fine
          return cached
        }
        return refresh
      })
    )
  }
  // anything else: not intercepted.
})
