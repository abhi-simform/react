# Changelog

All notable changes to the ShopSphere storefront. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow the release tags. Each stage of the learning plan is one branch and one `stage-NN-done` tag; the entries below group them by what a user or operator can see.

## [1.0.0-storefront] - 2026-10-29

First release of the customer storefront (`frontend/`) with the API (`backend/`) it needs. The admin portal (`admin/`) is the owner's own learning track and is not part of this release.

### Added
- **Catalog and discovery (stages 0-6, 9, 11):** category tree and breadcrumbs, listing with URL-driven filters/sort/pagination/infinite feed, search with autocomplete and facets, product page (gallery, variants fixture, specs, related/similar/also-bought rails, recently viewed), compare tray, deals and flash-sale countdown.
- **Cart and checkout (9, 11):** server cart with a guest-to-user merge, coupons, multi-step checkout (address, delivery slot, payment, review), COD and Razorpay (test mode, mock gateway locally), idempotent order placement, order list/detail with tracking, cancel, return and invoice PDF.
- **Accounts and security (7, 10):** register, e-mail verification, login, password reset, Google sign-in (mock locally), sessions list and revoke, idle sign-out, cross-tab logout. Access token in memory, refresh token in an HttpOnly cookie with rotation and reuse detection.
- **Reviews and Q&A, wishlist, addresses, notifications (6, 11):** reviews with photos and votes, questions and answers, wishlist with optimistic updates, address book, real-time notifications and live order tracking over Socket.io.
- **Quality (12):** Vitest unit/component/journey tests with MSW, axe accessibility checks, Playwright e2e against the real stack, error boundaries and global error reporting, pre-commit hook and `npm run check`.
- **Performance and polish (13):** React Compiler, route and dependency code splitting, virtualised long lists, image and font work (CLS), reduced-motion-aware animation, dark mode with tokens and no flash, i18n (English, Hindi, Arabic/RTL) with display currency, SEO (per-route meta, JSON-LD, sitemap, prerendered static routes), installable PWA with offline support, HTTP caching policy with ETag/304.
- **Production (14):** static SPA server (`npm start`) and nginx-unprivileged Docker image (25 MB) with a compose `app` profile; per-build security headers (CSP with inline-script hashes and the API origin); GitHub Actions workflows for the frontend and backend; Render/Railway/Vercel/Netlify configuration and `DEPLOY.md`; Sentry integration that is compiled out without a DSN (scrubbing, request-id tags, source maps, vitals); `docs/` handover set (environments, runbook, testing, observability, ADRs, retrospective, release checklist); an SSR experiment on its own branch with a documented comparison.
- **Backend (B1-B12):** the REST API (Express 5, MongoDB replica set, Zod), OpenAPI, jobs (BullMQ or in-process), cache, audit log, hardening. Stage 14 adds `COOKIE_DOMAIN`, SMTP authentication, a production configuration guard, and a seed guard that protects remote databases.

### Changed
- `npm start` serves the static build (`scripts/serve-spa.mjs`) instead of the SSR runtime; `npm run build` also writes the environment-specific headers.
- Zod is imported from `@/lib/zod` (jitless, so the production CSP needs no `unsafe-eval`).

### Fixed
- The Content-Security-Policy written in 13.7 was never served and, once served, blanked the page (it allowed only one of the inline scripts): hashes are now computed from the built HTML.
- Every page load logged a `script-src eval` CSP violation (Zod's JIT probe): fixed by `jitless`.

### Security
- Production boot refuses insecure cookies, development JWT secrets, wildcard or non-HTTPS CORS origins. `db:reset` refuses a remote database without an explicit flag; seeded accounts on a remote database need `SEED_PASSWORD`. The production bundle is scanned for secret names, credential shapes and source maps (`npm run check:bundle-secrets`).

### Known limitations
See the README section "Known limitations".
