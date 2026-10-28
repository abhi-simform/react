# Debug log (Stage 12.7)

The method every entry follows: **reproduce -> isolate -> hypothesize -> verify -> fix -> prevent (a test)**.

The eight bugs live in `app/test/bug-hunt/bugs.tsx` as `Broken*` / `Fixed*` pairs (the broken versions are
kept ON PURPOSE and are imported by nothing else). `bugs.test.tsx` runs one regression test per bug against
BOTH versions: it passes for the fixed one, and `it.fails` asserts that the SAME test fails for the broken
one, so each test is proven to catch its bug.

> Honesty note. The plan has the owner hunt for bugs injected by someone else, using the browser's
> DevTools. Here the bugs were written by the same author, so "finding" them was not blind, and the
> "tool" column names the DevTools feature that locates that class of bug (what a learner should reach
> for); only the rows marked **measured** were actually run (Vitest, Playwright traces, Chrome's
> Performance domain over CDP). The live DevTools demos (conditional breakpoint, fetch breakpoint, heap
> snapshot in the Memory tab) are procedures below, not recordings.

| # | Kind | Symptom | Locate with | Root cause | Fix | Regression test |
| - | ---- | ------- | ----------- | ---------- | --- | --------------- |
| 1 | Stale closure | The ticker goes 0 -> 1 and sticks | Sources: breakpoint in the interval callback, Scope pane shows `count = 0` every tick; React DevTools: state is 1 | `setCount(count + 1)` inside an effect with `[]` deps closes over the first render's `count` | `setCount((c) => c + 1)` (updater reads latest state) | fake timers advance 3 s and expect `ticks: 3` |
| 2 | Missing / unstable key | Text typed in row B jumps to row C after removing row A | React DevTools Components: the row components' keys are `0,1,2` and their state does not follow the data | `key={index}`: React reuses row 0's state for what is now another item | `key={row.id}` | type in row Beta, remove Alpha, Beta keeps its text |
| 3 | Wrong dependency array | Going from product A to B keeps showing A | Network: no second request; the `react-hooks/exhaustive-deps` lint rule names `id` | `useEffect(..., [])` ignores `id` | `[id, load]` + a "current" flag against late answers | rerender with a new id, expect the new title |
| 4 | Unhandled 4xx | A deleted product shows "Loading..." forever | Console: `Uncaught (in promise) ApiError 404`; Network: the 404 | `.then` without `.catch`, no error state | `.catch` into an error state with `role="alert"` | MSW answers 404, expect the alert (the broken version never shows it) |
| 5 | Race condition | Type "a" then "ab" fast: results for "a" sometimes win | Network (waterfall): the slow "a" response lands after "ab"; throttling makes it reproducible | Two requests in flight, the older answer arrives last and overwrites | `AbortController` per effect run, cleanup aborts the old one | "a" answers in 60 ms, "ab" in 5 ms: only "result for ab" may remain |
| 6 | Memory leak (missing cleanup) | Heap and listener count rise with every visit | Memory tab: heap snapshot before/after 20 navigations, comparison view, filter "Detached" and the retained listener closure; Performance monitor: "JS event listeners" | `addEventListener` in an effect with no `return () => removeEventListener` | return the cleanup | dispatch `resize` after unmount: the handler must not run |
| 7 | Layout shift | Text under a photo jumps when the image loads | Performance panel: "Layout Shift" entries / Lighthouse CLS; Elements: the `img` has no box before it loads | `<img>` without `width`/`height` (no reserved space) | `width`, `height` and `aspect-ratio` | the image carries `width` and `height` |
| 8 | Wrong cache key | Switching category tabs keeps showing the first tab's list | React Query devtools: ONE query `["category-products"]` for both tabs | `queryKey` omits `category`, which `queryFn` reads | `["category-products", category]` | switch tab, expect the second tab's list |

## Drills

**Conditional breakpoint inside a `reduce`.** In Sources open `features/cart/totals.ts`, click the gutter on
the line `lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0)`, right-click the marker -> *Edit
breakpoint* -> *Conditional* -> `l.qty > 1`. Add a quantity-2 line: execution stops only for that
line, `sum` and `l` are in Scope. (The same trick finds which ONE of 300 products has `stock < 0`.)

**Break on `fetch` to see who triggered a request.** Sources -> *XHR/fetch Breakpoints* -> `+` -> URL
contains `/cart`. Reload the cart page: it pauses inside `getJson` (the only caller of `fetch`); the
Call Stack reads upward `getJson <- send <- api <- getCart <- queryFn <- (Query internals) <-
useCart`, i.e. exactly which hook asked.

**Heap snapshot comparison (leak hunt).** Memory tab -> *Heap snapshot* on `/products`, then navigate
products -> deals -> products 20 times, take a second snapshot, pick *Comparison* and sort by *# Delta*.
A leak is a constructor whose count rises by about 20 (one per visit): with bug 6 it is the closure
`handler` kept alive by `window`'s listener list.

**Measured, automated version** (`e2e/memory.spec.ts`, Chrome's Performance domain over CDP with a forced
GC): 20 rounds of cart drawer + products + deals + products moved
`JSEventListeners 409 -> 435`, `Nodes 4686 -> 3600`, `JSHeapUsedSize 29.9 MB -> 32.5 MB`. That is a
plateau (a per-visit leak would add about 20 of whatever leaks per round); the spec fails above +150
listeners or +2000 nodes.

## Findings while testing (not injected: real bugs the Stage 12 tests found in the code)

| Where | Bug | Found by | Fix |
| ----- | --- | -------- | --- |
| `lib/duration.ts` `splitDuration` | `NaN`/`Infinity` (a bad `endsAt`) printed `NaN:NaN:NaN` | `it.each([NaN, Infinity])` | non-finite counts as "over" |
| `features/cart/lines.ts` `clampToStock` | `NaN` quantity (emptied number input) or stock leaked through `Math.min/max` | `never returns NaN` test | non-finite -> 0 |
| `features/catalog/utils.ts` `compareBy` | an unparseable date made the comparator return `NaN`, corrupting the sort | `an unparseable date does not poison the order` | `NaN` sorts last in either direction |
| `features/auth/schemas.ts` | `z.email().trim()` validated the PADDED string: a pasted `" me@x.com "` failed | normalising test | trim and lower-case, THEN `.pipe(z.email())` |
| `hooks/useNow.ts` | the shared clock kept its last `now` after the last subscriber left: a countdown mounted later flashed an old value | hook test with fake timers | forget the store when it empties |
| `lib/api/getJson.ts`, `lib/async.ts` | `instanceof DOMException` / `instanceof Error` failed for errors from another realm (jsdom, iframes): a timeout was reported as a network error | `a stalled server times out as TIMEOUT` | check `error.name` |
| `QuantityStepper` | several steppers on one page (cart lines) were all named "Increase quantity" | cart drawer RTL test (`getByRole` found several) | name includes the product |
| `ui/button.tsx` | a `Button` that renders a router `<Link>` was announced as `role="button"` | `getByRole("link", { name: "View cart" })` failed | `role="link"` when it renders a link |
