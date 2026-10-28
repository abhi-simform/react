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
