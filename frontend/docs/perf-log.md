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

