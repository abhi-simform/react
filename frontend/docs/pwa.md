# PWA: how the service worker works here, and how to debug it (13.10)

Files: `sw/sw.template.js` (the worker, hand-written), `scripts/build-sw.mjs` (fills in the precache list and a version, writes `build/client/sw.js`; runs as the last step of `npm run build`), `public/manifest.webmanifest`, `public/icons/*` (made by `scripts/make-icons.mjs`), `app/lib/pwa.ts` (register / update / install), `app/features/pwa` (`PwaSync`, `InstallButton`), `app/features/offline` (`/offline` page, `OfflineNotice`).

No Workbox / `vite-plugin-pwa`: its peer range is not clear for Vite 8 + React Router framework mode, and the worker is ~100 lines whose every rule can be read.

## What it does

| Request | Strategy |
| --- | --- |
| Navigation | network first; offline: the precached SPA shell (`/__spa-fallback.html`, or `/`) |
| `/assets/*` (content-hashed) | cache first (and precached) |
| Images | cache first, at most 80 entries (the seed's picsum images are cross-origin and opaque: cacheable, not inspectable) |
| Public catalog GETs (`/products`, `/categories`, `/brands`, `/banners`, `/config`, `/deals`, `/time`) | stale-while-revalidate, **only if** the request has no `Authorization` / `x-cart-token` header **and** the response says `Cache-Control: public` |
| **Everything else** (auth, cart, orders, me, payments, notifications, wishlist, every non-GET) | **not intercepted**: straight to the network, exactly as without a worker |

Precache: the shell HTML, the entry chunks, and for the pages that must work offline (home, listing, category, PDP, cart, checkout steps, deals, help, login, offline) the route module, its static imports and the lazy cart chunks (101 files, ~1.6 MB uncompressed). Not every route: the other ~100 chunks are cached on first use.

## Updates

A new build changes `sw.js` (its version is a hash of the precache list and `index.html`). The browser installs the new worker in the background and it WAITS (no `skipWaiting()`): `PwaSync` shows a persistent toast "A new version of ShopSphere is available" with **Reload**; pressing it posts `SKIP_WAITING`, the new worker takes over, and the page reloads once. A tab in the middle of checkout is never swapped under the user. The tab also asks for an update every time it becomes visible.

## Debugging a stale or odd service worker

1. DevTools > Application > Service Workers: see which worker is active/waiting, tick **Update on reload** while developing, use **Offline** to test, **Unregister** to remove it.
2. Application > Storage > **Clear site data** (tick "Unregister service workers"): removes the worker AND `shell-*`, `images-v1`, `api-public-v1` caches. This is the "nothing makes sense, start clean" button.
3. From the console: `await (await navigator.serviceWorker.getRegistrations()).forEach(r => r.unregister()); (await caches.keys()).forEach(k => caches.delete(k))`, then hard reload.
4. `vite dev` never registers a worker (production builds only), so a dev server is never served stale code by it. To test: `npm run build && npm start` and open http://localhost:5173 (localhost counts as a secure context).
5. If a user is stuck on old code: ship a build (new `sw.js` bytes). The old worker updates itself in the background; the toast appears on their next visit.
6. Rule when changing `sw.template.js`: nothing private may ever be cached. `e2e/pwa.spec.ts` browses signed in and fails if any cart/orders/auth/me/notifications response is in Cache Storage.

## Tests

`e2e/pwa.spec.ts` (production build; service workers are blocked in every other spec because requests made by a worker bypass `context.route`): installable (Chrome's own `Page.getInstallabilityErrors` is empty, manifest has 192/512/maskable icons), precache + control, offline browsing of visited pages plus the cart/checkout "You are offline" state and the offline page listing cached products, nothing private in Cache Storage, update prompt then Reload, and the install button.
