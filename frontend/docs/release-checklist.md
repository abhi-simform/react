# Release checklist: v1.0.0-storefront (14.9)

Run on 2026-10-29 against the production build (`npm run build`), the real API and MongoDB. "Met" means demonstrated here; "NOT met" is stated as such. Nothing was deployed (see `../../DEPLOY.md`), so deployment-dependent items are listed separately at the end.

## The plan's acceptance items

| Item | Result | Evidence |
| --- | --- | --- |
| All e2e green | **Met** | `npm run e2e`: 63 of 63 pass, three consecutive full runs (about 1.3 min each) after two test-side flake fixes (an `evaluate` racing the page reload in `pwa.spec.ts`; the register test clearing cookies while the silent refresh was still rotating them). Against the Docker containers (`docker compose --profile app`): 62 of 63; the one failure rewrites `build/client/sw.js` on the host disk and cannot work against an image. Backend: `npm test` 201 + 7 tests, lint, typecheck, build green. Frontend `npm run check`: 537 unit/component tests |
| axe clean | **Met** | `e2e/a11y.spec.ts` (public pages, signed-in pages, keyboard-only flows, focus restore), `e2e/contrast.spec.ts` and the dark-theme contrast tests in `e2e/theme.spec.ts`; component-level `vitest-axe`; Lighthouse accessibility 99-100 on the audited pages (`docs/perf-log.md`). Screen readers were not used (`docs/a11y-audit.md`) |
| Lighthouse mobile >= 90 on home, PDP, listing | **NOT met** | Lighthouse 13, default mobile profile (simulated slow 4G, 4x CPU), median of 3, production build served by `npm start`: **home 81, listing 80, PDP 78** (LCP 5.3 / 5.6 / 6.0 s, CLS 0.019 / 0 / 0, TBT 12-16 ms; SEO 100 on all three). Desktop was 98-99 (`docs/perf-log.md`). Why: a client-rendered page needs HTML -> JS -> API -> image, and the simulated mobile LCP is bounded by that chain, not by bytes (image bytes were already cut 70-90% in 13.5). What would move it: server-rendered product data (the SSR experiment measured PDP 78 -> 80 simulated and **56 -> 88 under applied throttling**, `docs/ssr-experiment.md`) or an edge-cached prerender. I did not tune the score down to the bar by weakening the audit |
| No console errors | **Met** | `npm run check:console`: 25 pages (18 guest, 7 signed in) of the production build, zero console errors/warnings, CSP violations, uncaught exceptions or failed API calls; run again through the Docker containers: same. (A missing PRODUCT page logs React Router's caught `NotFoundError` by design and is excluded from the script; the vitals beacon's rate limit is excluded too.) The CSP e2e also asserts no violation |
| Error tracking live | **NOT met** | No Sentry project or DSN exists here. Verified end to end against a fake ingest (`npm run verify:sentry`, 17 checks, including readable frames through the source map, scrubbing and request-id tags). Live verification is the first smoke step after a real deploy (`/debug/sentry`) |
| Backups and rollback known | **Met on paper, not rehearsed** | `DEPLOY.md` sections 1.6 and 7, `docs/runbook.md`. A restore was never run |
| Secrets rotated if ever exposed | **Met (nothing was exposed)** | `git log -p --all` scanned with the patterns of `DEPLOY.md` section 8 (connection strings with credentials, JWT secret assignments, `sk_`/`rzp_` keys, private-key blocks, AWS key ids): only placeholders, documentation examples and the mock gateway's public key id (`rzp_test_mockgateway`) matched. `.env` files are git-ignored; the `*.example` values are placeholders that the production boot guard refuses. A dedicated scanner (gitleaks) was not run |
| Legal pages present | **Met, with a caveat** | `/policies/privacy`, `/policies/returns`, `/policies/terms`: real text, linked from the footer and the sign-up form, prerendered head metadata, in the sitemap, unit and e2e tests. They were placeholder pages until this review. The text is a demo starting point, **not legal advice**; a lawyer must review it before a real launch |
| Test payments only | **Met** | The API's mock gateway is refused when `NODE_ENV=production` (no keys = `503 PAYMENTS_NOT_CONFIGURED`); `DEPLOY.md` and `environments.md` say Razorpay TEST keys only; no live key exists anywhere in the repo or docs; the privacy page and terms say orders are not fulfilled |
| Rubric re-score: no topic below "can explain with notes" | **Met** | `docs/retrospective.md`: lowest row is Delivery at 1 (explain with notes). The plan's stronger goal (no row below 2, starred rows at 3) is **not** fully met: Delivery 1, Payments 2, AI ownership 2 |
| Next three learning goals written | **Met** | `docs/retrospective.md` |

## Function

- [x] Guest and signed-in journeys: browse, search, filter, PDP, cart (guest cart merges on login), coupon, COD and (mock) Razorpay checkout, order tracking, cancel, return, reviews, wishlist, notifications (e2e + 25-page check)
- [x] Offline and update flow of the service worker (e2e); install prompt handled
- [x] i18n (English, Hindi, RTL smoke), currency display with "charged in INR" notice (e2e)
- [x] Theme: no flash, dark contrast (e2e)
- [ ] Real Razorpay test checkout and a real webhook delivery (needs a public URL; `DEPLOY.md` section 5)
- [ ] Real e-mail provider delivery (Mailpit locally)

## Security

- [x] Security checklist `docs/security.md` (XSS surface, token model, redirect safety, third parties: none)
- [x] CSP, nosniff, Referrer-Policy, Permissions-Policy served by `npm start` and nginx; the CSP's inline-script hashes and API origin are generated per build; no `unsafe-eval` (Zod `jitless`)
- [x] No secret or source map in the production bundle (`npm run check:bundle-secrets`, run in CI)
- [x] Production boot guard (insecure cookies, dev secrets, wildcard or non-https CORS) and seed guard (remote database) tested
- [x] Cross-site cookie behaviour understood and documented (`docs/environments.md`)
- [ ] `npm audit` was reviewed in 10.9 (build-time `shadcn` CLI findings only); not re-run for this release
- [ ] gitleaks / a secret scanner in CI (the manual scan above was run)

## Performance and accessibility

- [x] Budgets and real-browser measurements in `docs/perf-log.md`; JS budget script `npm run perf:budget` (needs a running build)
- [ ] Lighthouse mobile >= 90 (see above)

## Operations

- [x] Health endpoints (`/api/v1/health`, `/healthz`), structured logs with request ids, runbook, rollback table, secret rotation table
- [x] Docker: frontend image 25.4 MB, non-root (uid 101), `nginx -t` ok, headers and deep links checked; API image non-root and healthy; the compose `app` profile runs the whole stack (found and fixed: the API image crashed without `pino-pretty`)
- [x] CI workflows pass `actionlint`; their commands pass locally. **Not run on GitHub**
- [ ] Deployed to Atlas / Render / Vercel; smoke checklist (`DEPLOY.md` section 6) executed; uptime monitors created; spending limits set
- [ ] Branch protection enabled (repository setting)

## Sign-off

Released as `v1.0.0-storefront` (tag on the last commit of `stage-14-production`, together with `stage-14-done`) with the open items above stated in the README's "Known limitations" rather than hidden.
