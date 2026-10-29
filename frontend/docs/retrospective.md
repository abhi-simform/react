# Retrospective (14.9)

Written at the end of Stage 14. "I" is the person (or agent) who built the reference implementation by following the plan stage by stage; the rubric scores at the bottom are that builder's own, with evidence, not an external grade. Stage 0 had no recorded rubric score in the repository (the plan asks for one at the end of Stages 4, 9, 12 and 14; the earlier checkpoints in `docs/checkpoints/` are explanations, not scores), so the comparison below is against "nothing recorded: assume 0 for everything before Stage 1".

## What I learned, stage by stage

| Stage | What stuck | What was hard | What I would do differently |
| --- | --- | --- | --- |
| 0-1 Setup, JS | `filter/map/reduce/groupBy` without mutation; `fetch` failure modes (HTTP errors do not reject) | Resisting a library for everything | Write the abort/timeout helper first: it was used in every later stage |
| 2 TypeScript | Discriminated unions with exhaustiveness for async and order states; `unknown` at the boundary, `z.infer` for the rest | Generics in the API client | Derive types from Zod schemas from day one |
| 3 React basics | Derived state beats stored state; `key` resets state (the bug demo stayed in the repo) | Not reaching for `useEffect` | -- |
| 4 Effects | Most effects should not exist; cleanup + `AbortController` fixes races; stale closures | Five broken effects to hunt (the bug hunt taught more than the theory) | Add the ESLint exhaustive-deps rule before writing the first effect |
| 5 Routing | The URL is state (filters, sort, pagination); guards are UX, the API is security; error boundaries per level | Typed navigation and thin routes | Decide the feature-folder rules before the first feature (ADR 0001 came late enough to need a clean-up day) |
| 6 HTTP/API | The envelope, one `ApiError`, one place that calls `fetch`; skeleton/empty/error/refreshing states | The real API did not match the plan's data model: trust Swagger over the plan | Keep an `api-notes.md` from the first call |
| 7 Forms | RHF + Zod as one source of truth; server errors mapped to fields; async validation without races | The multi-step checkout form with Back keeping values | -- |
| 8 State | Six homes for state; Context re-renders everything; Zustand only for small UI state | Resisting a global store | Run the state audit at the START of Stage 8, not after the labs |
| 9 Server state | Query keys as dependencies, `staleTime` vs `gcTime`, optimistic updates with rollback, seeding the cache | Migrating a hand-rolled `useFetch` without a big-bang rewrite | Take the pain-journal notes seriously earlier: they were the best argument |
| 10 Auth | Token in memory + HttpOnly refresh cookie, single-flight refresh, reuse detection; UX of expiry | StrictMode tripping rotation reuse detection (two refresh calls) | Draw the sequence diagram before coding |
| 11 Commerce | Idempotency keys, server-side payment verification, webhooks as the source of truth, Socket.io lifecycle | Coupons/deals/totals in integer paise vs the API's whole rupees | Test totals against hand-calculated carts first |
| 12 Quality | Test behaviour, MSW for failure paths, Playwright against the real stack and a PRODUCTION build; axe in CI | Flaky e2e from a dev server that reloads mid-test | Run e2e against a build from the first spec |
| 13 Performance | Measure, change one thing, measure again (the perf log); CLS from images, fonts and skeletons; the React Compiler; HTTP vs Query caching | Mobile LCP is bounded by the client-rendered chain, not by bytes | Decide the rendering strategy (SPA vs SSR for the PDP) before optimising images |
| 14 Production | A security header you never served is a hypothesis (the CSP blanked the page); cookies are a site question; one funnel for errors; "off" must really be off | Docker image pulls were very slow, and I gave up waiting too early (they finished later): re-check slow infrastructure before declaring it broken | Do the production-like build (static server + real headers) in Stage 5, not Stage 14 |

## What was hard, overall

- **Where reality disagreed with the plan.** The API's data model differs from the plan's (names, whole rupees, no variants), the refresh token's StrictMode behaviour, shadcn's generated `cn` import, Lighthouse 13 having no PWA category, Sentry 11's `dataCollection` options. Each time the fix was to read the real thing and write down the deviation.
- **Things only a production build shows.** The e2e suite found two bugs the dev server hid (12.6, 13.x); the CSP blanking the page (14.1); a `script-src eval` violation from Zod (14.6). The rule I would keep: *every claim about production needs a production-shaped run.*
- **Environments I could not reach**: no cloud accounts, no GitHub remote, no Sentry project (the Docker registry was slow, not unreachable). The result is a set of files that are validated as far as a laptop allows and an explicit list of unchecked boxes (README "Known limitations", `DEPLOY.md`, the release checklist).
- **Hydration** (SSR experiment): not a rendering problem but a state problem: anything that reads the browser during render.

## What I would do differently, as a whole

1. Treat production as a stage-5 concern: a static server with the real headers, and the e2e suite on it, from the beginning.
2. Write the ADR when the decision is made, not at the end (nine ADRs now exist; four were written in Stage 14 from notes).
3. Keep the perf log and the pain journal from day one (they became the best documentation).
4. Decide the SPA-vs-SSR question for the product page at Stage 9, when the data layer is chosen: it changes where data loading lives.
5. Put the legal pages in when the footer links are added; they were placeholders until the release review.

## What I still cannot explain well (honest list)

- How Sentry's debug-id based source map matching works internally (I used the plugin and verified the maps resolve with an independent library; I did not read the protocol).
- Brotli vs gzip trade-offs at the CDN level and how Vercel/Netlify decide which to send.
- The React Compiler's exact memoisation rules beyond the traps I hit (`formatRupees(x)` zero-arg impure reads).
- Real-world behaviour of third-party-cookie blocking across Safari, Firefox and Chrome (I reproduced the mechanism with two hostnames; I did not test the browsers).
- Operating MongoDB Atlas (network access, backups, indexes at scale): never done against a real cluster here.
- TanStack Start in anger: the admin portal is a scaffold, so the comparison column is from documentation.

## Self-assessment rubric (plan section 8): re-score

Scale: 0 cannot explain, 1 with notes, 2 without notes, 3 explain + debug a broken example + teach. Evidence is a pointer a reviewer can open. Stage 0 baseline: not recorded (treated as 0). A row that I could not exercise for real is scored for what I demonstrated, and says so.

| Area | Score | Evidence |
| --- | --- | --- |
| JS lists, fetch/abort | 3 | `app/features/catalog/utils.ts` + tests; 4.3 race demo; `lib/api/getJson.ts` |
| TS unions, `unknown`, generics, `z.infer` | 2 | `lib/asyncState.ts`, `lib/api/client.ts` generics |
| React keys, derived state, `key` reset | 3 | 3.5 notes, bug demo kept in `scratch` |
| Effects (when / when not) ★ | 3 | 4.1, 4.10 bug hunt, `docs/debug-log.md` |
| Effects cleanup + race diagram ★ | 3 | 4.3 notes and the debounced search with abort |
| Hooks written and tested | 2 | `useDebounce`, `useCountdown`, `useLocalStorage` tests |
| Stale closures | 3 | 4.9 lab with three fixes |
| Routing URL state | 3 | 5.4, `filters.ts` + tests |
| Routing modes, guards, boundaries | 2 | 5.1, 5.6, 5.7; guard-is-UX note |
| Structure and import boundaries | 3 | ADR 0001, ESLint `no-restricted-imports` (and the Zod rule added in 14.1) |
| HTTP/API client | 3 | `lib/api/*`, `docs/api-notes.md` |
| UX states | 2 | `AsyncView`, skeleton/empty/error tests |
| Forms ★ | 3 | checkout multi-step, server-error mapping, `docs/pain-journal.md` |
| Async validation / previews | 2 | pincode check, avatar upload (7.6, 7.8) |
| State homes | 3 | `docs/state-audit.md`, ADR 0005 |
| Context re-render behaviour | 2 | 8.2 notes, providers kept small |
| Server state ★ | 3 | `docs/query-policy.md`, ADR 0004 |
| Query migration | 3 | 9.1 to 9.6 with the pain journal as the argument |
| Auth ★ | 3 | `docs/auth-token-model.md`, ADR 0006, StrictMode reuse bug |
| Single-flight refresh, safe redirects | 3 | 10.3, 10.4, `safeRedirect` tests |
| Payments ★ | 2 | ADR 0007, `payments-manual-test.md` (mock gateway; the real Razorpay modal was not exercised) |
| Realtime | 2 | 11.9; socket lifecycle with token callback |
| Testing ★ | 3 | 537 unit/component tests, 60+ e2e, `docs/testing.md` |
| MSW + fake timers | 2 | `app/test/network`, countdown tests |
| Debugging ★ | 3 | `docs/debug-log.md`, 12.7 drills |
| Accessibility | 2 | axe in unit and e2e, `docs/a11y-audit.md` (no screen-reader sessions) |
| Performance ★ | 3 | `docs/perf-log.md`, budgets, SSR comparison |
| Performance trade-offs (memo, transitions, virtualization, splitting) | 2 | 13.2 to 13.4 |
| Polish (theme, i18n, SEO, PWA) | 2 | 13.7 to 13.10, `pwa.md` |
| Production ★ | 3 | 14.1 and 14.2: reproduced the prod-only CSP blank page and the cross-site cookie failure |
| Delivery (CI, deploy, monitor, roll back) | 1 | Files and docs exist and run locally; **no real deploy, no run on GitHub, no real Sentry project** (the Docker images were built and run locally; actionlint is clean) |
| AI ownership ★ | 2 | deviations and surprises logged per topic; a human reviewer should spot-check |

No row is below 1; the one row at 1 is Delivery, and the reason is honest: the delivery chain was written but never executed against real services. Rows marked ★ at 3 except Payments (2: only the mock gateway was driven), Production at 3 for the two things reproduced, and AI ownership at 2. The plan's goal (no row below 2, ★ rows at 3) is therefore **not fully met**: Delivery (1), Payments (2) and AI ownership (2) are open.

## Next three learning goals

1. **Run the delivery chain for real**: Atlas + Render + Vercel on a custom domain, the CI workflows on GitHub with branch protection, a real Sentry project, then fix what the smoke checklist finds (lifts Delivery to 2).
2. **Server rendering for one route**, end to end, with the BFF session question answered (ADR 0002's checklist), and compare with TanStack Start by building the admin portal's first data route there.
3. **Payments with real test-mode Razorpay**, including a failed payment, a duplicate webhook and a refund, driven from the dashboard (lifts Payments to 3).
