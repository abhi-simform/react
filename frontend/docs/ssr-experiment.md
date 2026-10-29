# SSR experiment (14.8)

Branch: `stage-14-ssr-experiment` (off `stage-14-production`, tag `ssr-experiment`; two commits). The same change as a patch: `docs/ssr-experiment/ssr-experiment.patch` (`git apply` it on a clean checkout). The SPA remains the shipped default; nothing on `stage-14-production` depends on this branch. Decision and comparison: `docs/adr/0002-spa-or-ssr.md`.

## What the branch changes

| Change | File(s) | Why |
| --- | --- | --- |
| `ssr: true`; `build` = `react-router build`; `start` = `react-router-serve ./build/server/index.js` | `react-router.config.ts`, `package.json` | The runtime of an SSR build (the SPA's `start` is a static server) |
| `serverGet` / `serverPost` (server-only `.server.ts`, `API_INTERNAL_URL` for server-to-server calls, Zod-validated, 4 s timeout, `X-Forwarded-For` on actions) | `app/lib/serverApi.server.ts` | The server reaches the API over its own URL; the browser bundle cannot import it |
| PDP `loader` (product from the API, 404 for an unknown slug as a real status), `headers` (`s-maxage=30, stale-while-revalidate`), seeds Query with `initialData` + `initialDataUpdatedAt` | `app/routes/product-detail.tsx`, `features/product/hooks/useProduct.ts`, `ProductDetailPage.tsx` | The product in the HTML (title, price, JSON-LD) and no duplicate request on the client |
| Shell `loader` (category tree) replacing the `clientLoader` prefetch, seeded into the per-request query cache | `app/routes/shell.tsx` | A route with `clientLoader` and no `loader` is NOT server-rendered (empty body); the header menu also gets into the HTML. Failure never breaks the page (falls back to the client fetch) |
| `createQueryClient()` factory; `App` makes one per server render | `app/lib/query-client.ts`, `app/root.tsx` | A module-level client on a server is shared by all visitors |
| `suppressHydrationWarning` on `<html>` and on the "listed ... updated 9 minutes ago" line | `root.tsx`, `ProductDetailView.tsx` | Deliberate server/client differences (theme script; locale and time dependent text) |
| `useInView`: `useSyncExternalStore` with a server snapshot instead of `typeof IntersectionObserver` in render | `app/hooks/useInView.ts` | Server and browser rendered different HTML for lazy sections |
| `LocaleProvider`: constant server snapshot (`en`/INR) | `app/features/i18n/LocaleProvider.tsx` | A `<select>`'s value is not patched at hydration |
| Login as `action` + `<Form>` at `/login-action` | `app/routes/login-action.tsx` | Comparison with RHF + mutation; forwards the API's `Set-Cookie`; same Zod schema on the server |
| `npm run ssr:check` | `scripts/ssr-check.mjs` | Loads 13 routes x 3 visitor profiles in Chromium and fails on any hydration warning |

## Run it

```bash
git checkout stage-14-ssr-experiment          # or: git apply docs/ssr-experiment/ssr-experiment.patch
cd frontend && npm run build && npm start      # http://localhost:5173 (needs the API on :4000)
curl -s localhost:5173/p/<slug> | grep -o '<title>[^<]*</title>'     # View Source shows real HTML
npm run ssr:check                              # hydration check; use `npm run dev` for the verbose React warnings
```

## Results (production builds, this machine, API local)

- **View Source** `/p/the-ordinary-j63-night-cream-ski-00200`: 65 kB HTML, `<title>The Ordinary J63 Night Cream | ShopSphere</title>`, canonical, `Product` and `BreadcrumbList` JSON-LD, price 1354, `<h1>`. SPA: 6 kB, `<title>ShopSphere</title>`, no JSON-LD. `/p/nope-nope`: 404 (SPA: 200).
- **Lighthouse mobile, median of 3** (`scripts/perf/lighthouse.mjs` settings, Lighthouse 13; the "applied" rows use real throttling instead of the default simulation, which hides the effect of an earlier-discovered image):

| Page | Mode | SPA | SSR |
| --- | --- | --- | --- |
| PDP | simulated | perf 78, LCP 6.00 s, FCP 0.90 s | perf 80, LCP 5.41 s, FCP 0.76 s |
| PDP | applied slow 4G + 4x CPU | perf 56, LCP 10.57 s, FCP 9.83 s | **perf 88, LCP 3.70 s, FCP 1.69 s** |
| Home | simulated / applied | 81 / 57, LCP 5.28 / 8.52 s | 82 / 64, LCP 4.85 / 9.82 s |
| Listing | simulated / applied | 80 / 56, LCP 5.52 / 9.54 s | 81 / 67, LCP 5.14 / 9.63 s |

SEO score is 100 for both (the SPA's `<head>` is complete after JavaScript; Lighthouse renders it). The SEO difference is what a crawler WITHOUT JavaScript sees, which Lighthouse does not measure: the first rows above and `e2e/seo.spec.ts`. LCP did not improve on home and listing: their content comes from client-side queries, so SSR (without loaders for them) only delivers the skeleton sooner. TTFB went from ~1 ms (static file) to 2-14 ms with a local API; in production add the API round trip, or cache the HTML at a CDN.
- **No duplicate fetch**: the browser requested the product detail 0 times on the SSR PDP (it asked for related products, vitals and `config/public`).
- **Hydration**: `npm run ssr:check` against the dev server (React's verbose messages): 39 of 39 combinations clean (13 routes x {English, Hindi browser, stored Hindi + USD + dark}).
- **e2e on the SSR build**: 53 pass, 9 fail, all explained: 4 PWA tests (the service-worker build step needs the static shell), 3 production-header tests (the static-server behaviour they assert: `react-router-serve` sends no CSP/immutable headers and its fallback differs for unknown files), 1 SEO test that asserts the SPA limitation, and (before the locale fix) 1 i18n test, which found a real hydration bug.
- **Login action**: `curl -d 'email=...&password=...' /login-action` (no JavaScript) answers 302 + `Set-Cookie`; wrong password 400 with the message in the HTML; invalid e-mail 422 from the same Zod schema; `?from=//evil.com` redirects to `/`. In the browser the forwarded cookie is accepted by `/auth/refresh` (200) but the SPA still shows "Log in": its session bootstrap is gated by a localStorage hint that only the client sets (see the ADR).

## What I gained and lost with the action version of login

Gain: works without JavaScript, validation on the server with the one schema, no loading state to code (`useNavigation`), the password never sits in client state. Lose: as-you-type validation and the field error mapping of RHF, the single-flight helper, the access token in memory (the model of ADR 0006 does not exist on the server), and the whole session bootstrap integration. Verdict: not worth it for this app's token model; worth it for a content site with a classic cookie session.

## If you adopt SSR for the product page later (checklist)

1. Loader for `/p/:slug` and `/c/:slug` only; keep every private route client-rendered.
2. `API_INTERNAL_URL` (private network), per-request `QueryClient`, no module-level state that holds user data.
3. CDN in front with `s-maxage`/`stale-while-revalidate` (the HTML is anonymous); purge or short TTL for price/stock.
4. CSP with nonces (`entry.server.tsx`), because inline script contents are per request; drop the hash pipeline for that host.
5. Decide the session model (BFF cookie on the frontend host vs the current API cookie) before SSR-ing anything user specific.
6. Service worker: precache from the build manifest, not from `index.html`.
7. Re-run `npm run ssr:check` in dev and the e2e suite; add `e2e/seo.spec.ts` assertions for the Product JSON-LD in raw HTML.
