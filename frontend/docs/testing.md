# Testing

What runs, where, how long, and what each layer is for. (The strategy was decided in Stage 12; this is the map.)

| Layer | Tool | Where | Run | What it proves | Not what it is for |
| --- | --- | --- | --- | --- | --- |
| Unit (pure logic) | Vitest (`unit` project, node) | `app/**/*.test.ts` | `npm test` | money and totals, filters, schemas, reducers, scrubbing, header parsing | anything that needs a DOM |
| Component / integration | Vitest + Testing Library + MSW (`dom` project, jsdom) | `app/**/*.test.tsx`, `app/test/journeys/*`, `app/test/network/*` | `npm test` | behaviour through the screen: search -> filter -> URL, PDP -> cart, checkout steps, cancel order with optimistic rollback, failure paths with MSW | real layout, real browser APIs, real API |
| Accessibility | `vitest-axe` on components; `@axe-core/playwright` on pages | `app/test/a11y.test.tsx`, `e2e/a11y.spec.ts`, `e2e/contrast.spec.ts` | `npm test`, `npm run e2e` | names/roles/labels, keyboard order, focus restore, colour contrast in light and dark | screen-reader quality (manual checks are in `docs/a11y-audit.md`) |
| End to end | Playwright (Chromium; desktop + an iPhone profile) | `e2e/*.spec.ts` | `npm run e2e` | the REAL stack: API on :4000 with MongoDB, the production build served by `npm start`: auth, browse, checkout and Razorpay mock, i18n/RTL, theme without flash, SEO, HTTP caching and 304, PWA offline/update, production headers and CSP, memory | exhaustive branch coverage (that is the lower layers' job) |
| Backend | Vitest + a real MongoDB (`shopsphere_test`) | `backend/tests/*.test.ts` | `cd backend && npm test` | every route group: happy path, auth failure, validation failure, one edge case; production config and seed guards | load |
| Pipeline verification | scripts | `scripts/verify-sentry.mjs`, `scripts/check-bundle-secrets.mjs`, `scripts/perf/*` | `npm run verify:sentry`, `check:bundle-secrets`, `perf:budget` | Sentry events end to end against a fake ingest; no secret or source map in the bundle; JS budgets | |

## Gates

- Local pre-commit: Prettier + ESLint on staged files (`.githooks`, installed by `npm install`).
- Local full gate: `npm run check` (format, lint, typecheck, unit/component tests, build; about 30 s).
- CI: `.github/workflows/frontend-ci.yml` and `backend-ci.yml` run the same commands as separate jobs plus e2e and the Docker image builds.

## How to run the e2e suite

Needs Docker (MongoDB replica set, Mailpit): `docker compose up -d`. Then `cd frontend && npm run e2e`. Playwright starts the API (`../backend npm run dev`) and builds + serves the storefront itself, and `global-setup.ts` resets and seeds the database (`npm run db:reset`; set `E2E_SKIP_RESET=1` to keep your data). One worker on purpose: the specs share one database and one seeded customer, and the API's auth rate limiter (30 per 15 minutes per IP) is not meant for parallel logins (the fixtures send a distinct client IP per test where they must). A failed test keeps its trace: `npx playwright show-trace e2e/.results/<test>/trace.zip`.

## Conventions that keep it reliable

- Tests assert behaviour (roles, labels, text), never implementation details.
- Network in component tests is MSW with the same envelope as the API; failure paths (409, 5xx, network) are tested, not just success.
- Time is faked in unit tests (`vi.useFakeTimers`); e2e waits on conditions, never on sleeps.
- `context.route` disables the HTTP cache and hides service-worker traffic: specs about caching, the service worker and offline use plain Playwright `test` (see the comments in `e2e/pwa.spec.ts`, `e2e/http.spec.ts`).
- A test that cannot fail is not a test: when adding one, break the code once and watch it fail (13.7's "no flash" test passed without the fix until it sampled the right paint).

## Known gaps

No visual-regression suite; no load test; Safari/Firefox are not in the Playwright matrix (Chromium only, with an iPhone viewport profile); the real Razorpay Checkout and real Google OAuth are not exercised (mock gateway and mock Google); the deployed environment has no automated smoke test yet (`DEPLOY.md` section 6 is manual).
