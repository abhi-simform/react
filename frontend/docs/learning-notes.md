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

## 2.3 `unknown` vs `any`, and untyped data

`lib/api/envelope.ts` has `ApiErrorEnvelope` and the hand-written guard `isApiError(x: unknown): x is ApiErrorEnvelope` (every check is a `typeof`/`in` narrowing; no `as` cast at all, so the "except inside the guard" allowance was not needed). `scratch/09-guards.ts` runs 15 malformed values (null, `{}`, `{success:true}`, missing/wrong-typed `code`/`message`, `success: "false"`) through it: all `false`.
`getJson` (`lib/api/getJson.ts`) now returns `Promise<unknown>`, uses `isApiError` to throw an `ApiError` with typed `status`/`code`/`details` (e.g. `code: "NOT_FOUND"`), and falls back to `code: "HTTP_ERROR"` when the failing body is not an envelope (a proxy's HTML 502). `HttpError` from Stage 1 is gone. `response.json()` is `Promise<any>` in `lib.dom`, so the helper annotates it as `unknown` immediately: that one line is the difference between "checked" and "unchecked" for everything downstream.
What stopped compiling when `getJson` returned `unknown` (`tsc` output): `homeData.ts` lines 20-22 (`Expected 0 type arguments`, since the old `getJson<ListResponse>(url)` was a pure lie, an `as` in disguise) and 31-32 (`'newest.value' is of type 'unknown'`). I fixed it with a hand-written `isProductList` narrowing in `homeData.ts`, deliberately tedious and shallow (checks only what the rails use): this is the cost Zod removes in 2.6. `any` is contagious because anything touched by it becomes `any` too (`const p = await res.json(); p.items.map(...)` silently typechecks with a typo like `p.itemz`); `unknown` forces narrowing before use.

## 2.4 Generics, practically

- `lib/api/envelope.ts`: `PageMeta`, `ApiSuccess<T>`, `ApiFailure`, `ApiResponse<T> = ApiSuccess<T> | ApiFailure` (discriminated by `success`), `Paginated<T> = { items: T[]; meta: PageMeta }`, plus the guards `isApiError` / `isApiSuccess`.
- `lib/api/client.ts`: `request<T>(path, init?)` unwraps the envelope (returns `data` or throws `ApiError`) and always sends `credentials: "include"`; `requestPaginated<T>` does the same for lists and returns `{ items, meta }`. Deviation: the plan's `getProducts` is "a one-liner over `request<T>`", but the API puts the list in `data` and paging in `meta`, so a second helper is needed to keep `meta`; both getters are still one-liners: `features/catalog/api.ts` (`getProducts(query)`, `getProduct(slug)`) over them. The one `as T` / `as T[]` in the client is commented as the "trusted generic" that 2.6 removes the need for.
- Utility types: `ProductCardData = Pick<Product, "slug" | "name" | "images" | "price" | "mrp" | "ratingAvg">` (real field names, not the plan's `title`/`basePrice`), `CartItemInput = Omit<CartItem, "priceSnapshot">`, `ProductQuery = Partial<{ page, limit, sort, ... }>` (all params optional). `Awaited<ReturnType<typeof getProducts>>` yields the page type (see `scratch/type-tests.ts`).
- `lib/groupBy.ts`: `groupBy<T, K extends PropertyKey>(items, key): Record<K, T[]>`, now used by `brandCounts` (the brand facet); a boolean-returning selector is rejected because `K` must be a `PropertyKey`.
- `scratch/type-tests.ts` is compile-time only: `// @ts-expect-error` lines prove that `Promise<Product[]>` is not `Promise<string>` and that `getProducts()` is not `Promise<Paginated<Order>>`; if one ever starts compiling, `tsc` reports an unused directive. `scratch/10-generics.ts` runs the real calls against the API (filters, detail by slug, 404 -> `ApiError`, `limit=1000` -> 422 `VALIDATION_ERROR`).
- Reading `Record<string, Pick<Product, "title">[]>` aloud: "a record from strings to arrays of products, where each product only has its title" (an object whose every key is a string and whose every value is a list of title-only products).
- Scratch plumbing: `lib/env.ts` now also exposes `env.DEV`; Node has no `import.meta.env`, so the scratch resolver hook maps `@/lib/env` to `scratch/env-node.ts`. `npm run check:scratch` runs every numbered scratch script.

## 2.5 Typing React code

- `components/common/Rating.tsx`: `{ value; count?; size?: "sm" | "md" } & React.ComponentProps<"div">`, native div attributes (`title`, `data-*`, `className`) pass through; `role="img"` + `aria-label` for accessibility.
- `components/common/List.tsx`: generic `List<T>({ items, getKey, renderItem, empty })`. `T` is inferred from `items`, no annotation, and is used for the 308 products and for the sample orders (`test/fixtures/orders.ts`) on `/scratch/explorer`.
- `hooks/useToggle.ts`: returns `[value, toggle, setValue] as const`, so destructuring gives a typed tuple (`boolean`, `() => void`, `(v: boolean) => void`) rather than an array of the union of those three.
- `components/common/QuantityInput.tsx`: controlled `<input type="number">` with `React.ChangeEvent<HTMLInputElement>`; it parses with `valueAsNumber` (NaN for empty/garbage, which is ignored), truncates and clamps to `min`/`max` (typed 50 with `max=10` shows 10 in the browser). Props are `Omit<React.ComponentProps<"input">, "value" | "onChange" | "type" | "min" | "max">` plus our own `value`/`onValueChange`, so the native props stay available but the ones we own cannot conflict.
- `scratch/type-tests-react.tsx` (compile-time only): `List` infers `Product`; `renderItem={(p) => p.title}` fails (the plan's old field name; the real one is `name`); a `renderItem` typed for `Order` with product items fails; `useToggle()` has no 4th element; `size="xl"` and `value="1"` are rejected.
- No `React.FC`. Trade-off in one sentence: `FC` used to add an implicit `children` and made generic components awkward (a const arrow cannot carry `<T>` cleanly), while a plain function with a typed props object gives accurate `children`, works with generics and keeps the return type honest.
- Verified in the browser at `/scratch/explorer`: toggle button, qty clamping, rating (309 `role="img"` nodes = 308 products + 1), orders list; no console warnings. `Route.ComponentProps` is not needed yet (no route params until Stage 5).

## 2.6 Zod 4: runtime schemas and `z.infer`

- `lib/api/schemas.ts`: `pageMetaSchema`, `apiEnvelopeSchema(dataSchema)`, `paginatedSchema(itemSchema)` (full list envelope with required `meta`). Deviation: the plan puts these in `features/catalog/schemas.ts`; they are generic, and `lib/` must not import from a feature, so they live in `lib/api/`. `features/catalog/schemas.ts` has `productSchema`, `productDetailSchema` (`.omit({categoryPath}).extend({...})`), `productQuerySchema`, and the types: `Product`, `ProductDetail`, `ProductStatus`, `ProductSort` are all `z.infer<...>`. The hand-written `Product`/`ProductDetail`/`ProductStatus` were deleted from `types/domain.ts` (no duplicate remains), and the Stage 2.1 fixture loader is replaced by `paginatedSchema(productSchema).parse(raw)`, so all 308 snapshot products are validated by the same schema the live API goes through (the snapshot script now also writes `hasNext`/`hasPrev` into `meta`).
- `request<T>(path, { schema })` / `requestPaginated`: when a schema is passed, `T` is inferred from it (`request("/x", { schema: productSchema })` is `Promise<Product>`; `scratch/type-tests.ts` proves a wrong annotation fails) and a mismatch throws `ContractError` (message with request, path and first issue; all issues are logged to the console with `console.error`).
- Break the contract on purpose (`scratch/11-zod.ts`): a schema expecting `title` instead of `name` gives `API contract mismatch for /products?limit=2 at data.0.title: Invalid input: expected string, received undefined`; a schema with `price: z.string()` gives `... at data.0.price: Invalid input: expected string, received number`. The path pinpoints the exact element and field instead of a `NaN` three screens later.
- Stretch (recommended) done: validation runs only when `env.DEV` (`VALIDATE` in `client.ts`). Trade-off: faster production with no schema cost on big lists and no user-facing crash on a harmless extra/odd field, but the types become claims again in production (one `as T` in the client is that trusted path) and a real contract break shows up later as `undefined`/`NaN`, so production needs error reporting (Stage 14) to compensate. Alternative if validation is cheap enough: validate everywhere and report to Sentry.
- `parse` vs `safeParse`: `parse` throws a `ZodError` (fine in a fixture loader or where a failure should abort); `safeParse` returns `{ success: true, data } | { success: false, error }` (use it where you want to branch or build your own error, as the client does). `z.infer` (= `z.output`) is the type after transforms/defaults/coercion, `z.input` is what you must feed in: for `productQuerySchema`, `brand` is `"Apple,boAt"` as input and `string[]` as output, and `page` is `unknown` as input (coerce accepts anything) but `number` as output (`scratch/type-tests.ts`).
- `z.coerce.number()` for query strings, and its pitfall: it runs `Number(input)`, and `Number("")` is `0`, so an empty `?minPrice=` becomes "minimum price 0" and passes silently (`naiveMinPriceSchema.parse("") === 0`, asserted). `productQuerySchema` guards it with `z.preprocess` (`queryNumber`: "" becomes undefined before coercion); `.optional()`/`.default()` must be inside the preprocess, otherwise the undefined turns into `NaN` and fails (hit this while writing it).
- Zod 4 notes: `z.url()`, `z.iso.datetime()` are top-level now (not `z.string().url()`); error objects expose `.issues`; unknown keys are stripped by default (`__v` disappears from `Product`).
- Verified: `npm run typecheck`, `npm run build`, `npm run check:scratch` (all 12 scratch scripts), and the `/scratch/explorer` page in the browser (fixture parsed by Zod, validated live API calls from the async lab, no console errors apart from the expected 404 of the deliberately wrong route).

# Stage 3: React fundamentals refresh

Scope: reusable components (`ProductCard`, `ProductGrid`, `Gallery`, `VariantPicker`, `Tabs`, `QuantityStepper`, review box, `CartDrawer`) and a static PDP at `/p/:productSlug` fed from the fixture. Added shadcn `card`, `tabs`, `sheet` (base-ui); each `shadcn add` writes `import { cn } from "cn"`, which I changed to `@/lib/utils` by hand every time.

## 3.1 Components, JSX, composition: ProductCard

- `features/catalog/components/ProductCard.tsx` takes a `ProductCardProduct` (`ProductCardData` + `_id`, `brand`, `stock`, `ratingCount`) and `children` as a slot: `<ProductCard.Badge>` is a static property on the function, rendered over the image. `ProductGrid` is generic (`T extends ProductCardProduct`) so it accepts full `Product`s without losing the type. `Price` (rupees, MRP struck through, discount badge) and `Rating` live in `components/common/` and are reused.
- Single link target: the title is the only `<Link>`; it is stretched over the card with `after:absolute after:inset-0`, and the heart and "Add to cart" buttons are siblings with `relative z-10`, so there is no `<button>` inside an `<a>`. The image is `alt=""` (decorative: the title link names it); the box is `aspect-square` so nothing shifts when images load. Out of stock (31 of the 308 products have `stock: 0`): image dimmed, "Notify me" replaces "Add to cart".
- Data deviation: the plan's card has "title", "variants", "MRP"; the real API has `name`, one `price`/`mrp` in whole rupees and `discountPercent`. `lib/format.ts` gained `formatRupees` (the existing `formatCurrency` takes paise for the cart layer).
- Demo route `/scratch/grid`: 24 fixture products, 2/3/4/5 columns (`grid-cols-2 md:3 lg:4 xl:5`).

## 3.2 Lists and keys (key-bug demo)

`ProductCard` owns `liked` state. `app/scratch/key-bug/IndexKeyGrid.tsx` is the deliberately broken grid (`key={index}`); `ProductGrid` (in use everywhere) uses `key={product._id}`. Observed on `/scratch/grid`: liked card 1 ("The Ordinary J63"), switched sort to price ascending. With index keys the heart stayed on position 1 and now sat on a different product ("Hachette N35 Novel"); with id keys the heart moved with its product to position 7. React matches state by key, and with an index key "the item at position 0" is the same instance whatever product it renders. (My first try liked position 3 and looked fine: that product was coincidentally also the third cheapest, a good reminder that a demo needs a case that actually moves.) No `key` warnings in the console.

## 3.3 State and derived values: Gallery, VariantPicker, Tabs, static PDP

- Route `/p/:productSlug` (`routes/product-detail.tsx`) reads `productDetailFixture(slug)` (list fixture + invented description/specs, since the fixture only has list fields). **Deviation:** the backend has no variants (one `sku` per product), so `test/fixtures/variants.ts` generates a deterministic colour x storage grid for every product, with one missing combination (Silver / 64 GB) and one out of stock (Blue / 256 GB) to exercise disabled options. Pure logic lives in `features/product/variants.ts` (`findVariant`, `isOptionAvailable`, `selectOption`, `stockMessage`); `scratch/12-variants.ts` asserts it (`npm run check:scratch` runs it).
- State inventory and why none of it can be derived: `Gallery` `index` (user's choice; image, next image and "2 of 4" are derived); PDP `selection` = `{ color?, storage? }` only (the chosen values are the irreducible input; the matching `Variant`, price, MRP, stock message and the "can buy" flag are computed in render from `variants` + `selection`). Tabs keep their own open-tab state inside base-ui. Storing the selected `Variant` object would go stale the moment `variants` changed.
- Invalid combinations: an option is *disabled* when no in-stock variant has it at all, and *dimmed* (line-through but still clickable) when it does not fit the other chosen options. Clicking a dimmed option runs `selectOption`, which keeps the new choice and clears any other attribute that no longer fits. Verified in the browser: Blue + 128 GB, then 256 GB (Blue/256 is out of stock) leaves only `256 GB` selected and the message "Select all options to see availability"; Silver then gives Silver + 256 GB.
- Gallery: arrow keys (on any thumbnail or the group) wrap around, thumbnails have `aria-label="Show image N of M"` and `aria-current`, an `aria-live="polite"` region announces "Image 2 of 4", and the next image is preloaded with React 19's `preload()` from `react-dom` (a resource hint that is legal during render, no effect needed). Verified: image 4, ArrowRight goes to 1, ArrowLeft twice goes to 3. shadcn `Tabs` (base-ui) is keyboard operable out of the box (ArrowRight moves focus and selection).
- A first dev-server load showed "Invalid hook call ... useRef null" from `TabsRoot`: Vite had just discovered the new `@base-ui/react/tabs` dependency and re-optimised, briefly serving two copies of React. A hard reload fixed it; not a code bug.

## 3.4 Events and controlled inputs: QuantityStepper, review box

- `components/common/QuantityStepper.tsx`: controlled by the parent (`value`, `onValueChange`, `min`, `max` = stock), buttons disable at the limits, `aria-live="polite"` announces the committed value. It is a `type="text" inputMode="numeric"` input with a separate local `draft` string: a `type="number"` input would still deliver `""`, `"-"` or `"1e3"` mid-typing and `valueAsNumber` is `NaN` for those. Rule: only a valid integer inside [min, max] is committed while typing; on blur / Enter the draft is clamped (`0`, `-1` become 1, `999` becomes the max) or discarded (`""`, `abc`, `2.5` fall back to the last committed value). Verified with the real input events on the PDP (max 6 for the chosen variant): `"" -> 3`, `"0" -> 1`, `"-1" -> 1`, `"999" -> 6`, `"abc" -> 6 (unchanged)`, `"3" -> 3`, `"2.5" -> unchanged`.
- Interaction with variants: switching to a variant with less stock must not leave `qty > stock`. Instead of an effect that "fixes" state, the PDP derives `quantity = Math.min(qty, maxQty)` in render (the stored `qty` is the wish, the shown/used value is derived).
- `features/product/components/ReviewForm.tsx` (inside the Reviews tab): a 500-character textarea with a live counter and `maxLength`, star picker as a native radio group (arrow keys move and select for free, each star has a real `<label>` with "3 stars: Okay" for screen readers, `peer-focus-visible` ring), `onSubmit` with `preventDefault`, errors in `role="alert"` and the first invalid field focused through refs (rating first, then text). Valid submit logs `{ rating, text }`. Verified: empty submit focuses the first star, rating-only focuses the textarea, counter shows `4 / 500`.
- Controlled vs uncontrolled: controlled gives one source of truth (live counter, instant validation, derived UI) but re-renders per keystroke and needs state plumbing per field; uncontrolled (a `ref` or `FormData` read on submit) is cheaper and simpler but you cannot react to every change. Stage 7 swaps this for React Hook Form, which is mostly uncontrolled underneath.
