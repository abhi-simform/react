# Performance log (Stage 13)

> Rule: **measure, then optimize, then measure.** Every change below has a number from before and after.
> Numbers are from one machine (Apple Silicon laptop, headless Chromium from Playwright), the production build served by
> `react-router-serve` on localhost, the API on localhost. Absolute values are NOT comparable to a real phone; the
> before/after DELTAS are the point. Lighthouse results have run-to-run noise of a few points / a few hundred ms of LCP.

## How the numbers are produced

| Tool | What it gives | How |
| --- | --- | --- |
| Lighthouse 13 (lab) | Perf score, LCP, FCP, CLS, TBT, bytes, LCP element, layout-shift culprits | `scripts/perf/lighthouse.mjs` (mobile = Lighthouse default: slow 4G + 4x CPU, simulated; desktop = 10 Mbps, no CPU throttle) |
| Interaction script | INP (worst interaction), long tasks, CLS during the interaction, DOM size, React Profiler commits | `scripts/perf/interaction.mjs` with CDP `Emulation.setCPUThrottlingRate` 4x |
| `web-vitals` library | LCP / INP / CLS / FCP / TTFB of real visits (field data) | `app/lib/vitals.ts`, beacons to `POST /api/v1/metrics/vitals`, p75 at `GET /api/v1/admin/metrics/vitals` |

**Lighthouse could run** (installed in a scratch folder, driving Playwright's Chromium). INP cannot be measured by Lighthouse
(it needs a real interaction): the interaction script reports it from the browser's Event Timing API instead. The built-in
browser pane / DevTools Performance panel was not driven by hand: the traces below are PerformanceObserver data, not a
flame chart screenshot.

## 13.1 Baseline (before any Stage 13 change)

Commit state: `stage-12-quality` frontend + B12 backend. Cart is the anonymous, EMPTY cart (Lighthouse uses a clean profile).
PDP = `/p/the-ordinary-j63-night-cream-ski-00200`.

| Page | Form | Perf | LCP | FCP | CLS | TBT | JS KB | Img KB | Total KB | Req |
|---|---|---|---|---|---|---|---|---|---|---|
| home | mobile | 81 | 5.2 s | 0.76 s | 0.022 | 11 ms | 333 | 580 | 1073 | 68 |
| home | desktop | 96 | 1.4 s | 0.20 s | 0.013 | 0 ms | 333 | 1205 | 1710 | 86 |
| listing | mobile | 80 | 5.4 s | 0.76 s | 0.011 | 0 ms | 327 | 968 | 1455 | 72 |
| listing | desktop | 95 | 1.5 s | 0.20 s | 0.016 | 0 ms | 327 | 967 | 1468 | 74 |
| pdp | mobile | 78 | 6.0 s | 0.76 s | 0.024 | 30 ms | 357 | 363 | 879 | 64 |
| pdp | desktop | 78 | 1.2 s | 0.20 s | 0.414 | 0 ms | 357 | 1305 | 1830 | 89 |
| cart | mobile | 87 | 4.1 s | 0.76 s | 0.009 | 0 ms | 326 | 0 | 393 | 46 |
| cart | desktop | 100 | 0.2 s | 0.21 s | 0.001 | 0 ms | 326 | 0 | 393 | 46 |

| Page | Form | LCP element | LCP parts (TTFB/load delay/load/render delay, ms) | Layout shift culprit(s) | A11y | BP | SEO |
|---|---|---|---|---|---|---|---|
| home | mobile | `<img alt="" fetchpriority="high" loading="eager" src="https://picsum.photos/seed/banner-flash/1200/400">` | 3/135/379/18 | div.flex > main#main > div.flex > section.rounded=0.022 | 96 | 100 | 92 |
| home | desktop | `<img alt="" fetchpriority="high" loading="eager" src="https://picsum.photos/seed/banner-flash/1200/400">` | 3/145/487/59 | div.flex > main#main > div.flex > section.rounded=0.011 / body > div.flex > header.flex > nav.flex=0.002 | 96 | 100 | 92 |
| listing | mobile | `<img alt="" width="400" height="400" loading="lazy" src="https://picsum.photos/seed/h-m-t66-slim-fit-shirt-men-00102-0/800/800">` | 5/168/398/10 | div.flex > header.flex > nav.flex > button.group/button=0.009 / li > article.relative > div.flex > button.flex=0.002 | 95 | 100 | 92 |
| listing | desktop | `<img alt="" width="400" height="400" loading="lazy" src="https://picsum.photos/seed/u-s-polo-g81-hoodie-men-00104-0/800/800">` | 5/172/474/8 | div.flex > aside.w-60 > div.flex > fieldset.text-sm=0.014 / body > div.flex > header.flex > nav.flex=0.002 | 97 | 100 | 92 |
| pdp | mobile | `<img alt="The Ordinary J63 Night Cream image 1" width="800" height="800" src="https://picsum.photos/seed/the-ordinary-j63-night-cr` | 4/159/434/15 | div.mx-auto > nav.px-4 > ol.flex > li.flex=0.024 | 97 | 100 | 83 |
| pdp | desktop | `<img alt="The Ordinary J63 Night Cream image 1" width="800" height="800" src="https://picsum.photos/seed/the-ordinary-j63-night-cr` | 4/149/408/21 | body > div.flex > main#main > div.mx-auto=0.390 / div.mx-auto > div.p-4 > div.grid > div.md:col-span-2=0.025 | 97 | 100 | 83 |
| cart | mobile | `<p>` | 5/381 | div.flex > header.flex > nav.flex > button.group/button=0.009 / div.flex > header.flex > nav.flex > button.group/button=0.000 | 96 | 100 | 82 |
| cart | desktop | `<p>` | 5/145 | body > div.flex > header.flex > nav.flex=0.001 | 96 | 100 | 82 |

### What the baseline says

- **Mobile LCP is 4 to 6 s on every page** (target <= 2.5 s). Desktop is fine (1 to 1.5 s). Score is dragged down by LCP only: TBT ~0, CLS fine on mobile.
- **LCP elements.** Home: the hero banner image (already `loading=eager` + `fetchpriority=high`, a 1200x400 JPEG for a 380 px wide slot). Listing: a **product-card image that is `loading="lazy"`** (the first row is lazy too) and requests the 800x800 file for a ~190 px slot. PDP: the 800x800 gallery image (not prioritised, sized 800 for every viewport). Cart: a text `<p>` that appears after the cart request (a "loading" line).
- **PDP desktop CLS 0.414** (poor, target <= 0.1): one shift of 0.39 on the main container. Culprit to investigate in 13.5.
- **Listing interaction CLS** (typing in the price box, then the refetch): 0.40; **scrolling the "load more" listing**: CLS 0.58 and 17 long tasks (1.2 s total) at 4x CPU by ~200 cards. Both fixed/explained below.
- **JS**: ~330 kB (transferred, compressed) on every page, even the empty cart: everything ships in the entry chunk path (13.3).
- Fonts 131 kB on pages that use several scripts (Inter variable, one file per unicode range, 47 kB for latin alone) (13.5).
- Bytes: listing 1.4 MB, desktop PDP 1.8 MB, mostly 800x800 images.

### Interaction baseline (production build, CPU 4x, `scripts/perf/interaction.mjs`)

| Scenario | INP | Long tasks (count / total) | CLS | DOM nodes |
| --- | --- | --- | --- | --- |
| typing "12345" in the min-price box (12 cards) | 72 ms | 0 / 0 ms | 0.399 | 706 |
| scrolling the load-more listing to ~200 cards (25 wheel ticks) | n/a (no input events) | 17 / 1230 ms (longest 98 ms) | 0.579 | 6,336 |


## 13.2 Render performance

Setup: the listing in "Load more" mode with **300 cards on screen** (the seed has 308 products; the plan's 500 is not reachable with this data; the
cost scales linearly, so the conclusion holds). New: a client-side "Filter loaded products" box and a "Price ceiling" slider on the listing, because
the real filters are server-side (a URL change refetches) and the plan's scenarios (a slider, typing with a big grid below) needed something that
re-renders a big tree. `PerfProfiler` (dev only) tallies React `<Profiler>` commits and render time; `interaction.mjs` measures INP and long tasks.
Production-build numbers (INP, long tasks) at CPU 4x and 6x; Profiler numbers from `vite dev` (a production build has the profiler compiled out), CPU 1x.

### Typing "shirt slim" (10 keystrokes) in the quick filter, 300 cards

| Variant | INP @4x | INP @6x | Long tasks @4x (n / ms) | Long tasks @6x (n / ms) | Grid render (dev) | Page render (dev) | Grid commits |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A. Naive: filter + map + render on every keystroke | **160 ms** (160/160/160) | **240-256 ms** | 1 / 123 | 2 / 251 | 171-184 ms | 215-231 ms | 12 |
| B. `useTransition` + `useMemo` + `memo(ProductCard)` + `memo(ProductGrid)` (by hand) | 48 ms | 64-72 ms | 1 / 53 | 3 / 198-208 | 23-24 ms | 83-85 ms | 22 |
| C. B + React Compiler | 48 ms | 56-104 ms | 0 / 0 | 2 / 130-140 | 10 ms | 27 ms | 11 |
| D. Compiler, ALL manual memoization removed | not measured in prod | | | | 47 ms | 210 ms | 11 |
| **E. (kept) Compiler + `useMemo(cards)` + `memo(ProductCard)`** | **40-48 ms** | **64-104 ms** | 0 / 0 | 2-4 / 136-261 | **9 ms** | **26 ms** | 11 |

Reading it:

- **INP 160 -> 48 ms @4x (-70%)** and 240-256 -> 64-104 ms @6x. The first keystroke ("s") unmounts ~250 cards: in A that all happens before the next paint, in B-E it is a **transition**, so React paints the typed letter first and does the grid in a later, interruptible slice. The grid is dimmed (`aria-busy`, `opacity-60`) while `isPending`.
- B has MORE commits (22 vs 12): each keystroke is two renders, an urgent one (the input) and a deferred one (the grid). Each is far cheaper. `useTransition` does **not** make the grid render faster (the same work happens); it makes it low priority and interruptible.
- The grid render fell from ~180 ms to ~24 ms in B because of `memo`: after a filter, 40 cards stay and none re-render (their view-model objects are identical). In A every card re-renders on every keystroke.
- **Compiler decision: adopted** (`vite.config.ts`: `@rolldown/plugin-babel` + `reactCompilerPreset` from `@vitejs/plugin-react`; 76 of 111 chunks contain compiled code; the existing `eslint-plugin-react-hooks` v7 compiler rules already pass, so the code base is "compiler-clean"). It roughly halved the commits and render time on top of B (C vs B: page render 84 -> 27 ms).
- **What the Compiler made redundant, and what it did not (D vs E):** removing `memo(ProductGrid)` and `useMemo(shown)` cost nothing (the Compiler caches those). Removing the remaining two (`useMemo(cards)` + `memo(ProductCard)`) made the grid 5x slower (D: 47 ms, page 210 ms). Reason: the Compiler memoizes values and elements *inside* a component, but a parent's `.map` still creates 300 fresh child elements when the array changes, and without `memo` each child function runs again; `memo` only works when the view-model objects keep their identity, and the Compiler did not keep `list.items.map(toProductCardVM)` stable on its own here. Both stay, with comments saying why.
- Tests run WITHOUT the Compiler (`vitest.config.ts` has no babel plugin): they test behaviour, which must be identical.

### The price-ceiling slider, drag from the right end to ~40% (25 pointer moves), 300 cards loaded, list in "load more" mode

| Variant | Product list requests | Page commits (dev) | Page render (dev) | Grid commits (dev) | INP @4x | Long tasks @4x |
| --- | --- | --- | --- | --- | --- | --- |
| Naive: every `input` event goes to the URL | **43** | 109-117 | 529-574 ms | 77-91 / 213-243 ms | 24-40 ms | 1-2 (51-152 ms) |
| Fixed: transient value in local state, URL updated on release | **2** | 30 | 207 ms | 4 / 47 ms | 48 ms | 0 / 0 |

(2 requests = the one filtered query + its auto-loaded second page; the 43 includes the refetch cascade and auto-loaded pages after each reset.)
The dragged value now re-renders the slider and its label only; INP of the pointer events themselves was never the problem (the work happened right after), the waste was 25 network requests and ~110 commits for one gesture.

### Decisions and caveats

- `useDeferredValue` was NOT used: `useTransition` fits when you own the setter (the input's text). `useDeferredValue` is the tool when the value arrives from outside (a prop from a parent you do not control) and the result is the same: a lagging copy.
- React Router 8 already wraps its router state updates in `React.startTransition` (`useTransitions` is on by default), and its docs warn against wrapping navigations in your own: so URL-driven filter changes were NOT wrapped in `startTransition`; the transition is used on purely local state.
- The earlier Stage 4 / 6 lab `app/routes/dev/memo.tsx` stays as the "toy" version; this is the real-page version.
- Honest limit: I did not drive React DevTools' Profiler UI ("why did this render" flamegraphs). `<Profiler>` gives commit counts and times, which is what the table needs; the explanations (identity of view models, `.map` creating elements) were checked by changing one thing at a time (rows B to E).
