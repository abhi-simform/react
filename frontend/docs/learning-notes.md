# ShopSphere learning notes

## 0.1 Tour the scaffold

One sentence per file:

- `app/root.tsx`: the HTML document shell (`Layout` with `Meta`/`Links`/`Scripts`), the root `<Outlet/>` and the global `ErrorBoundary`.
- `app/routes.ts`: the single source of truth for the route tree (`index`, `route`, `layout`, `prefix`), each entry points at a module under `app/routes/`.
- `app/routes/home.tsx`: the page module for `/`; its default export is the component rendered inside the root `<Outlet/>`.
- `app/app.css`: the Tailwind v4 entry plus the theme tokens (CSS variables) that shadcn components read.
- `app/components/ui/button.tsx`: a shadcn/base-ui `Button` primitive with `cva` variants; generated code, wrap it instead of editing per use.
- `app/lib/utils.ts`: exports `cn()` (class-name merging helper) used by every UI component.
- `vite.config.ts`: wires the Tailwind and React Router Vite plugins and turns on `tsconfigPaths` so the `@/` alias works in the bundler.
- `tsconfig.json`: strict TypeScript, bundler module resolution, `verbatimModuleSyntax`, and the `@/*` path alias to `./app/*`.

### View Source vs Elements (SPA mode)

`ssr: false` means the server (Vite dev / static host) sends an HTML shell with no page content: View Source (`curl localhost:5173`) shows a `<body>` containing only scripts and the `__reactRouterContext` bootstrap. The Elements panel shows the live DOM after React rendered in the browser. That difference is client-side rendering; the trade-off is a blank first paint until JS runs and weaker SEO for crawlers that do not run JS.

### Typo in `routes.ts`

I registered `route("hello", "routes/helo.tsx")` (typo) and Vite returned HTTP 500 with `ENOENT: no such file or directory, open '.../app/routes/helo.tsx'` from `compileRouteFile`: the route config is read at startup and every referenced module must exist. Fixing the path made `/hello` render `Hello ShopSphere` (HTTP 200); I then deleted the temporary route.

## 0.3 Alias, Prettier, strict TS

- Switched `~/*` to `@/*` in `tsconfig.json` and all `components.json` aliases; no `~/` imports remain.
- The scaffold's `button.tsx` imported `cn` from the `"cn"` npm package directly. Changed to `@/lib/utils` so there is one place to import `cn` from. `npx shadcn@latest add card` generated `card.tsx` importing from the `cn` package again (the registry template), so I fixed that import by hand and removed the card since nothing uses it yet. Any new shadcn component needs that same one-line fix.
- `npm run format` sorts Tailwind classes (checked: `p-4 flex text-sm m-2` became `m-2 flex p-4 text-sm`).
- A deliberate `const n: number = "x"` fails `npm run typecheck` with TS2322; removed.

## 0.2 Environment variables

- Only `VITE_`-prefixed variables are exposed through `import.meta.env`, and they are inlined into the bundle at build time, so anyone can read them. Secrets stay on the server.
- `app/lib/env.ts` throws at import time if `VITE_API_URL` is missing. I removed `.env.local` and restarted the dev server: the root error boundary showed "VITE_API_URL is missing..." instead of requests to `undefined/health`. Vite only reads `.env*` at startup, so a restart is needed after editing.
- The "Ping API" button (`HealthBadge`) fetches `/health` from an event handler. It works from `:5173` because the backend allows that origin in CORS. With the backend stopped, `fetch` rejects with `TypeError: Failed to fetch` (no status, no body) and the UI shows it in a `role="alert"` paragraph.
- Deviation: `frontend/.gitignore` had `.env*`, which also ignored `.env.example`; added `!.env.example` so the example is tracked.

## 0.4 Full-stack smoke test

- `GET /products?limit=2` returns `{ success: true, data: [...], meta }`. `limit` max is 60 (limit=61 returns a 422 VALIDATION_ERROR on `query.limit`).
- `POST /auth/register` with `{"email":"nope"}` returns 422 `{ success: false, error: { code: "VALIDATION_ERROR", message, details: [{ in, path, message }] } }`. `code` is for program logic, `message` for humans, `details[].path` maps to form fields, and the `x-request-id` response header is what you quote when debugging backend logs. A valid body returns `{ user, accessToken }` and sets the refresh cookie.
- Swagger (`:4000/api/docs`), Mongo Express (`:8081`) and Mailpit (`:8025`, started with `docker compose up -d`) are all reachable. Mailpit stays empty until an email flow (verify/reset) runs.
- Not done in this automated build: installing the React DevTools extension and DevTools Network throttling (Slow 4G, disable cache, Timing tab). Those are manual browser steps for the owner.

# Stage 1: JavaScript essentials

Setup: `node scripts/snapshot-products.mjs` pages through `GET /products` (the API caps `limit` at 60, so one `limit=100` curl returns 422) and merges all 308 products into `app/test/fixtures/products.json` (the full envelope; `data` is the array). Pure logic lives in `features/catalog/utils.ts` and `features/cart/totals.ts`; scratch checks run with `node scratch/<file>.ts` (Node 24 type stripping; added `allowImportingTsExtensions` to `tsconfig.json` so `.ts` specifiers typecheck).

Reality vs plan: prices in the API are integer **rupees** (not paise), products use `name` (not `title`) and `price` (not `basePrice`), `brand` is a plain string, and there are no variants on products yet. The cart layer works in integer paise (`toPaise(rupees)`), the catalog layer filters on the API's rupee `price`.

## 1.1 Destructuring, spread, rest, immutability

`updateQty`/`removeLine` (`features/cart/lines.ts`) and `toggle`/`deepFreeze` (`lib/immutable.ts`) return new arrays/objects. `scratch/01-immutability.ts` runs them on deep-frozen input and nothing throws; pushing to the same frozen array does throw a `TypeError`. Note `Object.freeze` on a `Set` does not stop `.add()`, so the toggle proof relies on the result being a different Set. `arr.push(x); setArr(arr)` does not re-render because React compares by reference (`Object.is`): same array, so state is "unchanged".

## 1.2 filter, map, find, some, every

`filterProducts` (`features/catalog/utils.ts`) is a conjunction of predicates; empty/undefined filters do not restrict (an empty brand list means "no brand filter", otherwise selecting then un-selecting a brand would show nothing). Brands use a `Set` for O(1) lookup, search lowercases `name + brand`. `scratch/02-filters.ts` asserts 5 combinations plus each filter alone; the expected counts came from an independent throwaway Python script over the JSON (not from the code under test), and the same values were seen in the `/scratch/explorer` UI (e.g. search "shirt" = 10, rating >= 4.5 = 82, Apple + rating >= 4.5 = 2).
Stretch done: `filterWithFacets` returns `{ items, facets.brands }` where brand counts ignore the brand filter itself (disjunctive facets). Selecting Apple still shows "OnePlus (4)" so users can widen the OR. The backend B1 facet counts must do the same, otherwise ticking one brand makes all the others read 0.
Pitfall seen in the explorer's number inputs: `Number("")` is `0`, so an empty box must map to `undefined`, not 0 (same trap as `z.coerce.number()` later).

## 1.3 reduce and groupBy

`computeTotals` (`features/cart/totals.ts`) is a `reduce` over lines in integer paise; the API sends rupees, so `toPaise()` (`lib/money.ts`) converts once at the edge. Rules chosen where the plan was ambiguous: free shipping when the *discounted* subtotal is strictly above 499.00 (exactly 499.00 still pays 40.00, asserted); empty cart ships nothing; percent discounts and tax are each rounded once with `Math.round`, so the parts add up to the total; a coupon below `minOrder` is ignored; a coupon never makes the subtotal negative. `scratch/03-totals-histogram.ts` has 8 hand-calculated carts (coupon hitting `maxDiscount`, below `minOrder`, rounding case, exact threshold).
`priceHistogram` uses integer-width buckets (`from`/`to` inclusive), so clicking a bar sets exact min/max rupee values; buckets always sum to `products.length`, empty input returns `[]`, equal prices return one bucket (no divide by zero), and a price range narrower than `bucketCount` returns fewer buckets. `brandCounts` uses `Map.groupBy` (needed `lib: ES2024` in `tsconfig.json`; it was ES2022). Float artefact check: `0.1 + 0.2 !== 0.3` but `toPaise(0.1 + 0.2) === 30`; `199.99 * 100` is `19998.999999999996`, hence the `Math.round`.
`[].reduce(fn)` with no initial value throws a `TypeError` (asserted), so an empty cart would crash the total; with `0` as initial value it returns `0`.

## 1.4 sort and comparators

`sortProducts` always uses `toSorted` (never `sort`) so the incoming array is untouched; `relevance` returns a copy in server order. `compareBy(...selectors)` composes comparators (first decides, later break ties) and compares strings with `Intl.Collator("en", { sensitivity: "base" })`. Tie-breaks for price/discount/newest: rating desc, then name; rating sorts by `ratingAvg` then `ratingCount` then name. `scratch/04-sort.ts` checks the original array (deep-frozen) is unchanged by reference and content, ties are ordered (5 neighbouring equal prices exist in the data), and that `["Zebra","Éclair"].toSorted()` puts "Éclair" after "Zebra" (UTF-16 code order) while the collator puts it next to "Eclair". `Array.prototype.sort` is stable in modern engines (asserted with a small stability case); `sort()` on frozen data throws, which is exactly the bug it would be on React props.

## 1.5 Optional chaining, nullish coalescing

`displayDiscount` and `safeBrandName` (in `features/catalog/utils.ts`) are checked in `scratch/05-defensive.ts` with `console.assert` (silent when green). `a || b` replaces every falsy value (`0`, `""`, `NaN`), `a ?? b` only `null`/`undefined`. ShopSphere example: a free-sample product with `price: 0` shown as `price || 99` becomes ₹99, which is a wrong price on screen; `price ?? 99` keeps `0`. Likewise a `discountPercent` of `0` must render as "No discount" deliberately, not because `0` was falsy.

## 1.6 Promises and async/await against the real API

Code: `lib/api/getJson.ts` (`getJson<T>` + `HttpError` with `status`), `lib/async.ts` (`sleep`, `withTimeout`, `isAbortError`), `features/catalog/homeData.ts` (`loadHomeData`), plus an "Async lab" panel on `/scratch/explorer` (buttons call the functions from event handlers, no effects). Verified two ways: `node --import ./scratch/register-alias.mjs scratch/06-async.ts` (the hook file teaches Node the `@/` alias) and in the browser panel.
- `fetch("/nope")` resolves with `ok: false, status: 404` (asserted); only `getJson`'s `if (!response.ok) throw` turns it into an error with the envelope message, e.g. `HTTP 404: Route not found: GET /api/v1/this-route-does-not-exist`.
- `loadHomeData` uses `Promise.allSettled`: the deliberately broken third URL ends up in `errors` while `newest` and `topRated` still hold 8 products each.
- `withTimeout(run, ms)` aborts via `AbortController` and races the abort signal, so even an operation that ignores the signal rejects. A 1ms timeout gives `error.name === "AbortError"`, which `isAbortError` tells apart from a real `HttpError`.
- Timings: `await a(); await b();` runs back to back (3 x `/products?limit=60` took ~47ms in the browser, ~20ms in Node), `await Promise.all([...])` overlaps them (~23ms / ~12ms); with `sleep(100)` twice it is 200ms vs 100ms. Local API latency is tiny so the difference is small in absolute terms. Not done: DevTools "Slow 3G"/"Offline" throttling and reading the Network panel waterfall (no manual DevTools in this automated run), the in-code timings stand in for it.

## 1.7 Modules and boundaries

Layout now matches plan 3.2: `features/catalog/{utils,types,homeData,index}.ts`, `features/cart/{totals,lines,types,index}.ts`, `lib/format.ts`, `lib/money.ts`, `lib/immutable.ts`, `lib/async.ts`, `lib/api/getJson.ts`. `features/*/index.ts` re-export an explicit named list (no `export *`) as the public API; the explorer route imports only from `@/features/catalog`. No file in `features/` or `lib/` imports `react` (grep'd). `formatCurrency(1299900)` gives `₹12,999.00` (2 decimals always; asserted in `scratch/07-format.ts`, including lakh grouping `₹12,34,567.89`).
Circular import, on purpose: `scratch/circular-broken/` (catalog imports cart, cart imports catalog's constant). Run with Node ESM it throws `ReferenceError: Cannot access 'CATALOG_NAME' before initialization` because cart.ts is evaluated while catalog.ts is still waiting for it (temporal dead zone); bundlers that emit `var`/CommonJS produce `"cart for undefined"` instead, the "undefined at runtime" symptom. Fix in `scratch/circular-fixed/`: move the shared constant into a leaf module (`names.ts`) that both depend on, so the graph is one-way. Barrel files can hurt tree-shaking because importing one name from the barrel makes the bundler load every module the barrel re-exports and, unless modules are provably side-effect free, it must keep them; in dev Vite also serves all of them. They also make accidental cycles easy (a feature file importing its own `index.ts`).
`npm run check:scratch` runs all scratch assertion files (the async one needs the backend running).

# Stage 2: TypeScript essentials

Added `zod@4` (4.6.7) as a dependency. Scope: a typed domain layer (`app/types/domain.ts`), discriminated unions, `unknown` at the boundary, generics for the API helpers, typed React building blocks, and Zod schemas that infer the types that cross the network.

## 2.1 Everyday types: modelling the domain

`app/types/domain.ts` holds `User`, `Address`, `Category`, `Brand`, `Product` (+ `ProductDetail`), `Variant`, `CartItem`, `Cart`, `Order`, `OrderItem`, `Payment`, `Review`, `Coupon`, `Deal`, with `Money` (whole rupees, as the API sends), `Paise` (cart layer only), `ISODateString`, `Id` aliases. Shapes follow the real B0 responses where an endpoint exists (users, categories, products) and the plan's data model otherwise (each marked "planned (Bn)"). No `any`.
What TypeScript / the real data revealed versus the plan's table:
- The plan says `title`, `basePrice`, `brandId`, `sellerId`, `variants`; the API sends `name`, `price`, `brand` (a string), `seller` (an id string), and no variants (one `sku` per product). Real shape wins.
- List and detail differ: `GET /products` has `categoryPath: string[]` (ids), `GET /products/:slug` has expanded `categoryPath` objects plus `description`, `highlights`, `specs`. Hence `Product` (list item) and `ProductDetail = Omit<Product, "categoryPath"> & {...}`.
- `User` uses `id` and `Category` uses `id`/`children`, products use `_id`.
- `products.json satisfies Product[]` fails with `Type 'string' is not assignable to type 'ProductStatus'`: JSON modules widen literals. Understood, not hidden: `app/test/fixtures/products.ts` is a typed loader that narrows `status` with a small runtime check (Zod takes over in 2.6). Everything else in the 308-product fixture already matched.
- `type` vs `interface`: I use `type` everywhere (unions, mapped/utility types, intersections all work with it; interfaces mostly matter for declaration merging and `extends` chains). Either is fine as long as the codebase is consistent.
- Rename: the cart layer's coupon rule is now `CouponRule` (paise) to avoid clashing with the domain `Coupon` (rupees, as stored/served).

## 2.2 Unions, narrowing, discriminated unions, exhaustiveness

- `lib/asyncState.ts`: `AsyncState<T>` (idle | loading | success{data} | error{error}) and `renderState`, whose `default: return assertNever(state)` forces every member to be handled. `lib/assert.ts` has `assertNever(x: never): never`. A minimal `ApiError` class lives in `lib/api/errors.ts` (the plan introduces it in Stage 6, but `AsyncState` needs something to hold).
- `features/orders/status.ts`: `statusLabel`, `statusColor`, `canCancel`, `canReturn`, each a `switch` over `OrderStatus` ending in `assertNever`. `features/orders/payment.ts`: `PaymentMethod` discriminated by `type`, `describePayment` (inside `case "razorpay"` the `razorpayOrderId` field is accessible; outside it would not compile).
- Exhaustiveness experiment: I added `"refunded"` to `OrderStatus` in `types/domain.ts` and ran `npm run typecheck`. It listed exactly the four switches to update, nothing else:
  `status.ts(27) / (49) / (68) / (87): TS2345 Argument of type '"refunded"' is not assignable to parameter of type 'never'.`
  I then handled `refunded` in all four (label "Refunded", tone neutral, cannot cancel, cannot return) and kept it in the union, so the final code includes it.
- Impossible state: with `{ isLoading: boolean; isError: boolean; data?: T }`, `{ isLoading: true, isError: true, data: [1] }` is a valid value (`scratch/08-unions.ts` shows it), and every consumer has to guess which flag wins. With `AsyncState` the same literal fails to compile (`@ts-expect-error` in the scratch file proves it), because `data` only exists on `"success"` and `status` is exactly one value.
- `scratch/08-unions.ts` also asserts `canCancel("delivered") === false` with `console.assert`.
