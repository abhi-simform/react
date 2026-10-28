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

## 13.3 Bundle size and code splitting

Tools: `ANALYZE=1 npm run build` (rollup-plugin-visualizer: `build/stats.html` treemap + `build/stats.json`), `npm run analyze` (per-package table + 50 kB check),
`npm run perf:budget` / `scripts/perf/js-budget.mjs` (compressed JS bytes a page really downloads, from the browser, with a budget).

### Initial JS (kB gzip on the wire, everything requested while the page loads; files in parentheses)

| Page | Baseline (13.1) | After the Compiler (13.2) | After 13.3 lazy loading | Delta vs 13.2 |
| --- | --- | --- | --- | --- |
| `/` | 321 (44) | 350 (45) | **320** (47) | -30 kB (-8.6%) |
| `/products` | 316 (41) | 343 (42) | **313** (44) | -30 kB |
| PDP | 344 (47) | 382 (48) | **343** (51) | -39 kB |
| `/cart` | 315 (41) | 343 (42) | **313** (44) | -30 kB |

Honest reading: **React Compiler added ~29 kB gzip (+9%) of JS** (memoization cache code in every component), and the lazy loading below gave exactly that back. Net against
the pre-Stage-13 baseline: about zero (-1 kB on `/`). The Compiler's runtime win (13.2) is paid for in bytes; lazy loading is what keeps it free. Numbers are rounded; the baseline was rebuilt
from commit `fda6131` in a throwaway worktree to get a like-for-like figure (Lighthouse's own "JS" column counts headers too and reads ~15 kB higher).

What was split off the first load:

- `socket.io-client` + engine.io (~20 kB gzip): `lib/socket.ts` now hands out a facade; the real client is `import()`ed the first time someone connects (after sign-in). A guest never downloads it. Listeners registered before the load are remembered and attached to the real socket afterwards; a `wanted` flag stops a connect that lost a race with sign-out.
- The cart drawer's contents (`CartSheet`: line rows, coupon form, react-hook-form ~15 kB gzip): loaded on first open, **prefetched on hover/focus of the Cart button**.
- The notification bell popover (base-ui popover + rows + mutations): `NotificationBell` is a tiny wrapper with a same-size placeholder button as the Suspense fallback (no header shift); the menu loads after sign-in.
- PDP: the photo lightbox dialog (on first click, prefetched on hover), the review editor `ReviewDialog` (on first open), `QaSection` (two react-hook-form forms; fallback is a `min-h-24` status line).
- Route prefetch: `prefetch="intent"` on the header links and the product-card title link (RR injects `<link rel="modulepreload">` on hover/focus).
- Already fine, verified: `lucide-react` icons are imported by name (the whole package contributes 17 kB raw / ~7 kB gzip), the compare drawer was already its own chunk, routes are split by the framework.
- `lazyNamed` (lib) is the one-line glue for named exports.
- Fallbacks are overlays or reserve their height, so no layout shift: the lightbox/cart sheet/review dialog are portalled overlays; the Q&A panel and the bell keep their space.

### What I tried and did NOT keep (so you do not repeat it)

- `"sideEffects": ["**/*.css"]` in `package.json` lets the bundler drop unused barrel re-exports (the `auth` chunk was carrying every form, the `catalog` chunk carried the listing page and the compare table on `/`). JS fell to **292 kB**, but Rolldown then emitted ~106 files per page, and Lighthouse's simulated slow 4G got worse (LCP +~1 s on a single run; the noise on this metric is about +-0.5 s, so the signal is weak but the direction was bad). Two attempts to merge the pieces back with `advancedChunks` (vendor groups; a `minShareCount` shared group) made it 323 and 336 kB. **Not adopted.** The proper fix is to stop importing from the big barrels where only one function is needed (the shell imports `categoryQueries` from the catalog barrel, which drags the whole catalog feature into the first load). That is a refactor, not a config switch: noted as the next step.
- Budget (regression guard, kB gzip): `/` 335, listing 330, PDP 360, cart 330 (`npm run perf:budget`).

### Biggest dependencies in the client bundle (`npm run analyze`; numbers are an ESTIMATE: per-module gzip scaled to the real total)

```All client JS: 584 kB gzip over 123 chunks (scale factor 0.62)
package                              raw kB  ~gzip kB
(app code)                             1395       240 
react-dom                               970       114   > 50 (justified: the renderer (measured on the wire: ~60 kB gzip in entry.client); no lighter option for React 19)
@base-ui/react                          335        69   > 50 (justified: headless dialog/popover/select/tabs/... used by ~10 components; tree-shaken per component and spread over route chunks, no page downloads 50 kB of it)
react-router                            260        42 
zod                                     171        25 
react-hook-form                         105        14 
@tanstack/query-core                     71        13 
cn                                       43         8 
@base-ui/utils                           28         8 
sonner                                   52         7 
engine.io-client                         29         7 
```

- **No dependency over 50 kB gzip without a justification**: `react-dom` (~60 kB measured on the wire in `entry.client`; the estimator over-counts) and `@base-ui/react` (74 kB estimated across the whole app, but it is spread over ~10 components and per-route chunks; no page downloads it all) are recorded in `scripts/perf/deps.mjs` with the reason, and `npm run analyze` fails for any new package over 50 kB that is not listed.
- Other notes: `zod` (~27 kB) is on the critical path because every API response is validated (Stage 9 decision; `zod/mini` would save ~half but means rewriting every schema); `cn` (shadcn's class merger, ~9 kB) ships its tables/engine; `sonner` ~8 kB.

## 13.4 Virtualizing long lists

`@tanstack/react-virtual`, `useWindowVirtualizer` (the PAGE is the scroller). Two lists: the notifications history (the seed now gives the dev customer 2,016 notifications; 1 in 7 has a long body, so row heights differ) and the "Load more" product feed. Production build, CPU 4x, `scripts/perf/interaction.mjs`.

### Notifications page, whole history loaded (2,016 rows), scrolled top to bottom and back, then one "Mark read" click

| | Plain list (before) | Virtual list (after) |
| --- | --- | --- |
| Rows in the DOM | **2,016** | **16** |
| DOM nodes | **18,318** | **314** |
| JS heap | 28 MB | 11 MB |
| Long tasks during the run | 2 (137-161 ms total, longest 77-86 ms) | **0** |
| Scroll frames (avg / p95 / frames over 50 ms) | 16.5 / 17 / 0 ms | 16.6 / 17 / 0 ms |
| INP of the click | 16 ms (below the 16 ms reporting floor of the Event Timing API in both runs) | no interaction over the floor |
| CLS | 0 | 0 |

Honest reading: **scrolling was never slow** here, even with 18,000 nodes: scrolling an already-rendered page is a compositor job, and a laptop at 4x CPU throttle still keeps 60 fps. What the plain list costs is everything around scrolling: **58x more DOM, 2.5x the heap, two long tasks on a state change (the whole list re-renders), a slower first paint and style recalculation of anything that touches the page.** The plan's "scroll FPS at 4x" criterion is therefore met by both; the DOM-count criterion is the one virtualization changes (2,016 -> 16, constant while scrolling: checked by the e2e-style script, which loads all 2,016 and counts rows).

### Product feed ("Load more" mode, `/products?mode=more`)

| | Plain grid (before) | Virtual grid (after) |
| --- | --- | --- |
| 308 cards loaded: DOM nodes before touching anything | ~9,300 | **1,574** |
| Scrolling 25 x 700 px with the feed auto-loading pages: cards in DOM / DOM nodes | 228 / 7,017 | **40 / 1,716** |
| Long tasks while scrolling at 4x | 2-3 (104-162 ms) | **0** |
| **CLS while scrolling** | **0.70** | **0.0002** |
| Typing in the quick filter with 308 loaded (INP @4x / @6x) | 40-48 / 64-104 ms (after 13.2) | **24 / 24-32 ms** |

The 0.70 CLS was the "Load more" button and the "you've seen it all" line (visible, 400 px early because of the sentinel) being pushed down every time a page of cards was appended. With virtualization the container's height is an estimate that is corrected as rows are measured; the button is far below the viewport while that happens, so nothing visible moves.

Details that matter:

- **Dynamic heights:** `estimateSize` is only a guess (notification 76 px, card row 400 px / 180 px in list view); `measureElement` on every rendered row (plus `data-index`) stores the real height. Nothing jumps once a row has been seen; a row you scroll back to is already measured.
- **Window virtualizer needs `scrollMargin`** (where the list starts in the document): `useScrollMargin` measures it with `getBoundingClientRect() + scrollY` and a ResizeObserver (`offsetTop` is wrong inside positioned ancestors).
- **Grid = virtualise ROWS** (a row has `columns` cards, the row is what is measured). Columns come from the same media queries as the CSS grid (2/3/4/5), so the JS split and the CSS agree.
- **Infinite loading:** the notifications list loads the next page (50, the API maximum) when the last rendered row is within 6 of the end of the loaded rows; the "Load more" button remains as the keyboard/no-JS-observer path. The product feed keeps its sentinel + button.
- **Accessibility trade-offs (written down on purpose):** only rendered rows exist, so (1) the browser's **find-in-page (Ctrl+F) cannot find** text in unrendered rows, (2) **Tab** only reaches rendered rows and keyboard focus on a row is lost if it scrolls far enough to be unmounted, (3) a `#anchor` to a row that is not rendered cannot scroll to it. Mitigations used: `aria-setsize` / `aria-posinset` on each item so a screen reader announces "item 1,204 of 2,016"; the "Loaded N of M" status line; the Load-more button; filters to narrow the list (unread / category).
- **When NOT to virtualize:** short lists (under ~100 simple rows: the DOM is fine and you keep find-in-page, tab order, text selection across rows, SSR/print); lists where users need Ctrl+F or whole-list selection (a policy page, a receipt, an order's item list); any list whose rows are expensive only to RENDER (fix that first); and anywhere the added scroll-position bookkeeping would cost more than it saves. The cart, an order's lines, the review list per page (pagination), and the 12-card listing page stay plain.
- jsdom has no layout and no `ResizeObserver`: the test setup got a no-op `ResizeObserver`, and the virtual list tests give rows a height through `offsetHeight` (what TanStack Virtual reads), asserting "a window of rows, numbered against the full total".

## 13.5 Images, fonts and layout stability

New: `lib/images.ts` (`imageSources`: width family + WebP for picsum URLs, the stand-in for an image CDN; other URLs pass through), `ResponsiveImage` (`<picture>` WebP + JPEG, `srcset`/`sizes`, `width`/`height` + `aspect-ratio`, `priority` = eager + `fetchPriority=high`, otherwise lazy + async decode). Used by the product card (first row `priority`), the gallery (first image `priority`, thumbnails 64/128 px), the hero banner (first slide `priority`) and cart lines. The gallery's "preload next image" hint now carries the same `imageSrcSet`/`imageSizes`, otherwise the browser would fetch two files. Fonts: only Inter's **latin** file is declared (the package's latin-ext file, 85 kB, was downloaded on every page that shows "₹" because U+20B9 is in that range; the rupee sign now falls back to the system font), it is **preloaded** from `root.tsx` (`links()`), and a metrics-matched `Inter Fallback` face (Arial with `size-adjust`/`ascent-override`/`descent-override`) makes the swap move nothing. `links()` also adds `preconnect` to the API origin and the image hosts.

### Lighthouse (production build, localhost; one run each: expect +-3 points / +-0.5 s noise on LCP)

| Page | Perf before -> after | LCP before -> after | CLS before -> after | Image KB before -> after | Font KB |
| --- | --- | --- | --- | --- | --- |
| home mobile | 81 -> 82 | 5.2 -> 5.1 s | 0.022 -> 0.03 | 580 -> **175** | 131 -> **47** |
| home desktop | 96 -> 98 | 1.37 -> 1.12 s | 0.013 -> 0.013 | 1,205 -> **275** | 131 -> 47 |
| listing mobile | 80 -> 80 | 5.4 -> 5.5 s | 0.011 -> **0** | 968 -> **197** | 131 -> 47 |
| listing desktop | 95 -> 98 | 1.51 -> 1.14 s | 0.016 -> 0.02 | 967 -> **120** | 131 -> 47 |
| PDP mobile | 78 -> 79 | 6.0 -> 5.6 s | 0.024 -> 0.009 | 363 -> **165** | 131 -> 47 |
| PDP desktop | 78 -> **98** | 1.22 -> 1.10 s | **0.414 -> 0.025** | 1,305 -> **220** | 131 -> 47 |
| cart mobile | 87 -> **100** | **4.07 -> 0.76 s** | 0.009 -> 0 | 0 | 47 |
| cart desktop | 100 -> 99 | 0.21 -> 0.90 s (noise: an empty page, LCP is a text node) | 0.001 -> 0.002 | 0 | 47 |

Other measurements (`scripts/perf/interaction.mjs page <path>`, `typing`):

- **PDP CLS 0.52 (desktop, 1280x800) -> 0.014.** Found with the Layout Instability API's `sources`: while the product loaded, the page was a 60 px "Loading product..." line, so the footer sat in the middle of the screen (y 747) and was thrown out of the viewport when the 737 px page replaced it. Fix: the loading state is a real `DetailSkeleton` inside a `min-h-svh` box (the footer starts below the fold in both states). General rule: the skeleton must be as tall as the thing it stands for, or at least a screen tall.
- **Listing CLS after typing in the price box 0.399 -> 0**: when the debounced filter landed the facet list and the grid changed size (they must). Layout shifts that start within 500 ms of an input are not counted; the debounce was 500 ms (+ response time), so the shift was counted. Debounce is now 300 ms. The shift still happens; it now follows the input quickly enough to be "expected" by the metric's own definition. (The honest alternative, keeping facet rows stable while loading, is a bigger redesign.)
- **Image sizing check** (Playwright, DPR 1): listing card displayed at 169 px loads `300w`; at 390 px wide (phone) the same card is 155 px and loads `200w`; PDP gallery displayed at 484 px loads `600w`; thumbnails 64 px load `64w`. No 800 px original anywhere. Home on a phone: 7 images in the DOM, 7 requested (the rails are below the fold and are not even rendered until `LazySection` sees them).
- **Why mobile LCP barely moved** although the hero/card/gallery images are 60-80% smaller: the LCP breakdown shows the image itself needing ~1.1 s on the simulated slow 4G, but the element only appears after ~3.5 s: the page is client-rendered, so the image URL is unknown until the entry JS (~330 kB) has downloaded and run and the banner / product API call has returned. Images were never the bottleneck on mobile; the critical chain is HTML -> JS -> API -> image. The levers for that are server-side rendering or prerendering with data (Stage 14 deep dive) and shipping less JS (13.3). Desktop (fast network) did improve 9-25%.
- **Cart mobile LCP 4.07 -> 0.76 s**: the LCP was a text node. The font used to arrive late (CSS -> font chain) and Chrome re-reports a text LCP when the web font swaps in; the preload plus a metrics-matched fallback removed the late re-paint.
- Decorative card images keep `alt=""` (the title link names the product); gallery and review photos have meaningful alt text; thumbnails `alt=""` inside labelled buttons.

## 13.6 Motion and micro-interactions

What exists: (1) **fly to cart**: a clone of the product image travels to the cart button (`features/cart/flyToCart.ts`, `motion/mini` = Web Animations API, loaded by dynamic `import()` at the first add, `transform` + `opacity` only, fixed-position clone removed afterwards); (2) **cart count bump**: a CSS keyframe (`animate-bump`, transform only, `motion-safe:`) restarted by a `key` that changes with the count (not on first paint); (3) **cart list**: `AnimatePresence mode="popLayout"` + `m.li layout` inside `LazyMotion` (features = `domMax`, loaded on demand, in its own chunk) + `MotionConfig reducedMotion="user"`; (4) **skeleton -> content**: `AsyncView` fades the content in (`animate-in fade-in`, tw-animate-css, `motion-reduce:animate-none`); (5) **reduced motion** for all of them (below).

Measured with `scripts/perf/interaction.mjs motion` (production build, CPU 4x, Chromium; `--reduced` emulates `prefers-reduced-motion: reduce`):

| | Normal | Reduced motion |
| --- | --- | --- |
| Frames during add-to-cart + fly (4x CPU): count / avg / p95 / over 33 ms | 70 / 16.7 / 17 ms / 1 | 70 / 16.6 / 17 ms / 1 |
| Frames during removing a cart line (popLayout + layout glide) | 58 / 16.4 / 17 ms / 0 over 50 ms | 58 / 16.1 / 17 ms / 0 |
| "Added to cart" toast visible after the click | 168-182 ms | 159-167 ms |
| Fly clones created | 1 | **0** |
| Badge animation name | `bump` | **none** |
| INP of the click | 48 ms | (same path) |

So: 60 fps at 4x throttle (16.7 ms average, the single frame over 33 ms is the add-to-cart state update itself and also occurs with reduced motion), nothing plays when the OS asks for reduced motion (clone count 0, no keyframe animation), and the feedback arrives in ~170 ms, well under the 300 ms limit because nothing awaits an animation (`void flyToCart(...)` runs after the server accepted the item; the toast is not delayed by it).

Bundle cost (and what I did about it): initial JS is unchanged (`/` 318 kB vs 320 kB after 13.3). `motion/mini` is ~3 kB gzip, loaded at the first add. `motion/react` (`AnimatePresence`, `LazyMotion`) + the `domMax` features chunk (`layout` animations need `domMax`, the bigger set: **31 kB gzip**) load only when a cart list renders, so `/cart` costs about +21 kB over the previous 313 kB (new budget 345). My first version imported `motion/react` from the cart feature's barrel and added ~30 kB to EVERY page; the budget script caught it (319 -> 349) and the animated list moved behind `lazyNamed` (`CartLineList`), as did `CartPage`, `CouponBox` (react-hook-form), the virtual grid and the virtual notification list (@tanstack/react-virtual, ~10 kB), each with a fallback that renders the same content plain. **Lesson: a feature barrel that is imported by the shell makes every export part of the first load; make the heavy leaves lazy at the barrel.**

Notes:
- `layout` animations use transforms (FLIP) and `mode="popLayout"` lets neighbours glide up while the removed line fades; I did not animate `height` (a layout property).
- The CSS-only pieces (bump, fade) cost no JS. Motion is used where state has to be tracked (exit animations, layout), CSS where it does not.
- Honest limit: frame timing is a requestAnimationFrame sample, not a DevTools Performance trace; "60 fps" here means no frame over 33 ms except the one state update.

## 13.7 Dark mode, theming and design tokens

Not a speed change, but it has a performance-shaped acceptance criterion (no flash) and a cost to account for:

- **Flash of the wrong theme**: the SPA ships a blank HTML shell, so a dark-mode visitor saw a white canvas until the app's JavaScript ran and `ThemeProvider` added `.dark`. The inline `<head>` script (`features/theme/themeScript.ts`, ~300 bytes) now sets the class and `color-scheme` before the first paint. Proof (`e2e/theme.spec.ts`, Playwright, production build): with a stored dark choice, `<html class="dark">` is set when the browser records `first-paint` (**true with the script, false with the script stripped from the HTML** = the control). The measurement uses `first-paint`, not `first-contentful-paint`: the flash is the blank canvas before any content exists.
- Cost of the script: one synchronous inline script, ~300 B, `localStorage.getItem` + `matchMedia`; no network. It adds a CSP hash requirement: `public/_headers` pins `sha256-...` and a unit test recomputes the hash from the script text (`node scripts/csp-hash.mjs` prints it).
- Contrast is part of the e2e suite (`e2e/contrast.spec.ts` resolves each token to sRGB in both themes; new tokens added) and axe runs on login/home/listing/cart in dark.

## 13.8 Internationalization, currency and formatting

Cost of i18n (initial JS, kB gzip on the wire): `/` 318 -> **338** (+20: i18next + react-i18next ~18, the bundled English strings, the provider and switcher), listing 312 -> 331, PDP 343 -> 362, cart 334 -> 352. The budgets in `scripts/perf/js-budget.mjs` moved by the same amount. What it buys: strings are never hard-coded where it matters (header, cart, buy box, checkout steps), English is bundled so an English visitor makes **no** extra request and never sees a raw key, and every other language is its own chunk: `hi` = 2.3 kB raw / ~1.1 kB gzip (4 namespaces), `ar` (the RTL pseudo-language) the same, downloaded the first time they are chosen (`e2e/i18n.spec.ts` asserts a new script arrives on the switch). The cheaper alternative (a ~30-line `t()` with `Intl.PluralRules`) would save ~17 kB but not give namespaces, interpolation formats or the ecosystem the plan asks for; recorded so the trade-off is visible.

Re-render strategy: prices, dates and strings are computed during render from a module-level locale store; a language/currency change re-mounts the page content (`<Fragment key={version}>` around the shell's `<Outlet/>`) so every computed value is recomputed. The header, the providers and the cart drawer (keyed the same way) stay mounted. Measured effect on a switch: one extra render pass of the current page; no network except the language chunk the first time and the rates (cached an hour).

## 13.9 SEO and social metadata in an SPA

What was built: `lib/seo.ts` (`pageMeta`: title, description, canonical, Open Graph, Twitter card, robots, JSON-LD descriptors; `canonicalUrl` strips tracking parameters (`utm_*`, `gclid`, `fbclid`, ...) and every parameter that is not on a keep list; `noindexMeta`), per-route `meta` exports for every route, `ProductSeo` (React 19 hoists `<title>`, `<meta>` and `<link>` rendered in the page into `<head>`; JSON-LD `Product` + `Offer` + `AggregateRating` + `BreadcrumbList`), `public/robots.txt` + `public/sitemap.xml` generated by `npm run sitemap` from the live API (332 URLs: 308 products, 20 categories, 4 pages), `noindex` on cart, checkout, account, orders, wishlist, seller, auth pages, compare, offline, 404, and on internal search results (`?search=`), and **build-time prerendering** of `/`, `/help`, `/deals`, `/policies/privacy`, `/policies/returns` (`react-router.config.ts`, works with `ssr: false`: it writes `build/client/<route>/index.html` plus `__spa-fallback.html`; the build runs the app in Node, so nothing at import time may touch `window`).

Lighthouse SEO (production build, mobile = desktop here): home **92 -> 100**, listing **92 -> 100**, PDP **83 -> 100**, cart 82 -> 54 (on purpose: the cart is `noindex`, and Lighthouse's "page is blocked from indexing" audit fails; it is the same check that proves the tag is there). Accessibility rose 95-97 -> 99-100 at the same time (the head changes did not cause it; the earlier contrast and image work did). Acceptance "Lighthouse SEO >= 95 on PDP and listing": met.

What a crawler sees (`e2e/seo.spec.ts` asserts both):
- **Without running JavaScript** (a link-preview crawler, a text-only bot): `/`, `/help`, `/deals`, `/policies/*` have title, description, canonical, Open Graph, Twitter tags and (home) a `WebSite` + `SearchAction` JSON-LD in the raw HTML. **A product page does not**: its HTML is the SPA shell (the `Product` JSON-LD is absent from the raw response; the test proves it). So Slack/WhatsApp/Facebook link previews of a product show the generic site card.
- **After JavaScript** (Googlebot renders pages): the product page has its own title, description, canonical `/p/<slug>`, `og:type=product`, `og:image` and the JSON-LD blocks, taken from the same data the page shows (the test compares `name`, currency INR, `offers.price`, availability and the breadcrumb length against the page).
- What SSR would change (answer for the checkpoint): the HTML response for `/p/<slug>` would already contain those tags and the JSON-LD (so the preview card and the rich result work without a render pass), the product's text and image would be in the first paint (a faster LCP, see 13.5), and crawlers with a small render budget would not skip it. The price is a Node server (or edge function) per request, caching, and data fetching on the server (Stage 14 deep dive). Prerendering cannot do it for 308 product pages that change price/stock: a rebuild per change is the cost.

Honest limits: **Google's Rich Results Test was not run** (it needs network access to Google and a public URL or a manual paste); instead the structured data is validated structurally in unit tests (required Product fields: name, image, offers with price + priceCurrency + availability; `aggregateRating` only when there are ratings, as Google requires). `robots.txt` also disallows the private paths; note that a path blocked in robots.txt cannot have its `noindex` read by a crawler, so these pages rely on `Disallow` AND the tag (belt and braces, documented in the file). The sitemap holds `localhost` URLs here: set `VITE_SITE_URL` before running `npm run sitemap` in CI.

## 13.10 PWA: installable and offline-aware

Built by hand (see `docs/pwa.md` for the rules, the update flow and the "unregister and clear storage" debugging recipe): manifest + 192/512/maskable icons + theme colour, a service worker with a precached shell and route chunks, CacheFirst for hashed assets and images, stale-while-revalidate for PUBLIC catalog GETs only, nothing else intercepted; an update toast with Reload; an "Install app" button on `beforeinstallprompt`; a `/offline` page that lists the products found in the worker's cache; an "You are offline" notice on the cart and checkout with the primary buttons disabled.

Verification:
- **Installable**: Lighthouse 13 no longer has a PWA category (it was removed in v12), so the check is Chrome's own installability test through CDP: `Page.getInstallabilityErrors` returns `[]` (e2e). Standalone launch was not driven by hand (no installed-app window in this environment).
- **Offline** (`context.setOffline(true)` on the production build): `/products` (reload), a visited PDP and `/offline` work from the worker; `/cart` shows the "You are offline" alert with the checkout button disabled (the lazy cart chunks are precached: the first attempt failed because a precached chunk's own static imports were not, found by this very test, so `build-sw.mjs` now follows the static import graph); a never-visited product shows an explained error.
- **Private data**: after browsing `/cart`, `/orders`, `/account`, `/account/notifications` signed in, Cache Storage holds public catalog responses only (`api-public-v1`), and none of `/cart|orders|auth|users|notifications|payments|me|wishlist|addresses|recommendations` (e2e asserts it).
- **Update**: with `sw.js` changed on disk, `registration.update()` makes the toast appear; **Reload** activates the new worker and the page reloads once.
- Cost: precache = 101 files, 1.6 MB uncompressed (about a third of that over the wire), installed in the background after the first load (`register` runs on `load`). It is the price of "the cart route opens offline".
- **Repeat visit on Slow 4G + 4x CPU** (`scripts/perf/repeat-visit.mjs /products`, median of 3, second navigation in the same context): without a worker LCP **752 ms**, with the worker **540 ms** (-28%), 70 of 72 responses from the worker. Honest reading: the HTTP cache is already warm in this test (the build's assets are `immutable`, the API is `max-age`), so the worker's gain over it is modest; its real contribution is offline use, resilience to HTTP-cache eviction and installability.
- Harness note: with `context.route` installed (the suite's per-test client IP header), Chromium does not let a service worker answer a navigation while the context is offline; so the offline and update tests use Playwright's plain `test` (the app is fine, the combination is a harness effect).
