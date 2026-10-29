# Admin track: learning notes

Notes for the `/admin` app (TanStack Start + Router + Query + Table + shadcn on base-ui). Port 3000, API on 4000.
The app shares NO code with `/frontend`: what was copied and how it hurt is in `pain-journal.md`.

## A.0 Orientation: scaffold, routing and rendering mode

### What the scaffold is

- `vite.config.ts`: `tanstackStart()` plugin (SSR build + server functions) next to `viteReact()` and Tailwind. The router plugin generates `src/routeTree.gen.ts` from `src/routes/`; the file is committed (it is generated, never edited by hand, and excluded from Prettier).
- `src/router.tsx`: `getRouter()` is a FACTORY, not a singleton: on a server every request needs its own router and QueryClient, otherwise one visitor's cache leaks into another's. I create the `QueryClient` inside it, pass it as router `context` and wrap the tree in `QueryClientProvider` through the router's `Wrap` option.
- `src/routes/__root.tsx`: `createRootRouteWithContext<RouterContext>()`. Its `shellComponent` renders the HTML document (`<html>`, `<HeadContent/>`, `<Scripts/>`); `component` is the `<Outlet/>` inside the page.
- `src/start.ts` (new): `createStart(() => ({ defaultSsr: false }))`, see below.

### Route tree I planned (all of it exists as files by the end of A.3)

```
src/routes/
  __root.tsx                 shell + context (queryClient, auth)
  login.tsx                  /login            (public)
  forbidden.tsx              /forbidden        (public: "no permission" for customers and wrong-role visits)
  _authed.tsx                pathless layout: guard + sidebar/topbar/breadcrumbs
  _authed/index.tsx          /                 dashboard (A.6)
  _authed/products/route.tsx /products         layout route: crumb + permission guard + <Outlet/>
  _authed/products/index.tsx /products         table
  _authed/products/new.tsx   /products/new     create (and ?from=<id> = duplicate)
  _authed/products/$productId.tsx  /products/:productId  edit
  _authed/categories.tsx, brands.tsx, users.tsx
  (A.4-A.7: orders/, coupons, deals, banners, reviews, returns, audit)
```

How a file path becomes a route: the file name is the path (`products/index.tsx` -> `/products` index route, `$productId` -> a dynamic segment read with `useParams`), a leading underscore (`_authed`) makes a PATHLESS layout (it wraps its children in a component and a `beforeLoad`, but adds nothing to the URL), `route.tsx` inside a folder is that folder's layout route, dots flatten nesting (`products.new.tsx` = `products/new.tsx`). The generator turns that into `routeTree.gen.ts` where every route is created with `createFileRoute(path)` and `.update({ id, path, getParentRoute })`; that file is also what gives `Link to="..."` its autocomplete and type checking. First lesson learnt the hard way: the scaffold's `routes/index.tsx` and my `routes/_authed/index.tsx` BOTH claim `/`; the generator refuses with "Conflicting configuration paths" (a pathless layout does not change the URL).

### Rendering mode: client-only pages (View Source before and after)

Before (scaffold default, `curl localhost:3000/`): the HTML contained the whole page: `<h1 class="font-medium">Project ready!</h1> ...` rendered on the server, plus the stream bootstrap and the client entry; the browser then hydrates it.
After `defaultSsr: false` (`curl localhost:3000/login` or `/`): `<head>` (meta, css link, `<title>`), an empty `<body>` shell with the toast region and the router's dehydration script, and the client entry. No page content: `curl` shows nothing from `Home`, the Elements panel shows `API: ok (db up)` after JS ran and the query resolved.

Why that is right here: the access token lives in browser memory, so a server could not render anything authenticated anyway; the admin console has no SEO need. What stays server-side: the document shell and the dev/prod HTTP server. What I do NOT use: `createServerFn` and route `loader`s running on the server (with `defaultSsr: false` loaders run in the browser, so `localStorage`/`window` are safe inside them). Per-route override exists: `createFileRoute(...)({ ssr: true })`. A subtlety: even with SSR off, the server still ran `validateSearch` for the first request (the dev server answered `/products` with a 307 that appended the default search params `?page=1&pageSize=20&order=desc&sort=createdAt`): URL canonicalisation happens on the server, rendering does not.

### React Router (storefront) vs TanStack Router (admin)

Rows are only added once I verified them in the admin code. Columns: what I do in `/frontend` (React Router framework mode, SPA) / what I do in `/admin`.

| Concern | React Router (storefront) | TanStack Router (admin) |
| --- | --- | --- |
| Route definition | A config file `app/routes.ts` (`route("products/:id", "routes/product.tsx")`), modules referenced by string path | The FILE SYSTEM is the config: `routes/_authed/products/$productId.tsx` + a generated `routeTree.gen.ts`; each file calls `createFileRoute("<its own path>")`, and the path string is type-checked against the generated tree |
| Layouts | `layout(...)` entries in `routes.ts`, `<Outlet/>` | pathless `_authed.tsx` (no URL cost) and `route.tsx` per folder, `<Outlet/>` |
| Params | `useParams()` returns `string \| undefined` for everything | `Route.useParams()` is typed from the path: `$productId` is a `string`, a typo in the name is a compile error |
| Data loading | `loader`/`clientLoader` in the route module, `useLoaderData`; I mostly use Query in components | route `loader` that CALLS the query client (`ensureQueryData`/`prefetchQuery` from `context.queryClient`) and the component reads the same Query cache with `useQuery`; router and Query cooperate (`defaultPreloadStaleTime: 0`) |
| Not found / errors | `ErrorBoundary` export per route, `root.tsx` boundary | `notFoundComponent` (root, route) and `errorComponent` per route; a 404 from the API is shown by the product edit route's own `errorComponent` |
| Code splitting | per route module automatically by Vite | automatic per route file too (the `?tsr-split=component` chunk in the dev server logs): component code is split from the route's `beforeLoad`/`loader` |
| Type safety | `typegen` for params, search is untyped `URLSearchParams` | everything: `Link to`, `params`, `search`, `context`, `loaderData` are inferred; the `Register` interface in `router.tsx` is what wires it |

## A.1 Authentication and the role-gated shell

- **Token model (re-applied, not shared).** Access token in a module variable (`lib/auth/session.ts`), refresh token in the API's httpOnly cookie. Verified in the browser: `localStorage` holds only the TanStack devtools state (no token), `document.cookie` is empty (httpOnly), reload restores the session with one `POST /auth/refresh`.
- **Single-flight refresh.** The API rotates the refresh token per use and revokes the session on a replay, so parallel refreshes would log everyone out. `refresh()` stores the in-flight promise. Demo: `__devBreakToken()` in the console (dev only) then three parallel API calls -> three 401s -> exactly ONE `/auth/refresh` (read from the Performance entries) -> all three retries succeed. `onUnauthorized` also compares the token the failed request carried with the current one: if someone already refreshed, just retry.
- **The guard is a layout route.** `_authed.tsx` `beforeLoad`: `ensureSession()` (restore once per page load) -> no user: `throw redirect({ to: "/login", search: { redirect: location.href } })`; non-staff: `redirect({ to: "/forbidden" })`; otherwise returns `{ user }` which becomes typed route context for every child (`context.user`). `beforeLoad` of the PARENT runs before its children's `beforeLoad`/`loader`, so a customer never mounts a single admin component or fires an admin query. Verified: customer@ -> "No permission" screen, network tab shows no `/admin/*` call; deep link `/products/<id>` logged out -> `/login?redirect=%2Fproducts%2F...` -> after login lands on the same URL (`safeRedirect` only accepts same-site paths: `//evil.example` and absolute URLs fall back to `/`).
- **The UI hides, the API protects.** `can(user, permission)` (`lib/auth/can.ts`) hides nav items and route-guards pages (`requirePermission`, a `beforeLoad` helper); the proof that the API is the real gate: `GET /admin/products` as customer -> 403, `GET /admin/users` as seller -> 403, seller A reading seller B's product -> 404 (backend `tests/b1.admin.test.ts`, and curl against the running API).
- **Sign-out clears the Query cache** (`useSignOut`) and `queryKeys` start with the user id, so another account in the same tab never sees cached rows.
- **Breadcrumbs** come from `useMatches()` + `staticData: { crumb }` declared per route (typed through `StaticDataRouteOption` module augmentation); the root-most match without a crumb is skipped.
- **Verified how:** browser pane (customer rejection, deep link round trip, seller nav, sign out), console experiments above. NOT verified: behaviour when the refresh cookie is revoked mid-session on a long-lived tab (the `setSessionLostHandler` -> `router.invalidate()` path is written, exercised only by reading the code).

### Router comparison rows added in A.1

| Concern | React Router (storefront) | TanStack Router (admin) |
| --- | --- | --- |
| Guards | a `loader`/`clientLoader` that `redirect()`s, or a wrapper component (`RequireAuth`) rendering `<Navigate/>`: the component can mount first | `beforeLoad` on a layout route: runs before children load/render, can `throw redirect()`, and RETURNS typed context (`user`) for all descendants |

## A.2 Data tables: TanStack Table with URL state

- **Headless means:** `useReactTable` computes state and row models (sorting, pagination, selection, visibility, header groups); it renders NOTHING. `components/data-table/DataTable.tsx` owns the markup (real `<table>`, `<caption>`, `<th aria-sort>`), shadcn only supplies the styled primitives (`Table`, `Checkbox`, `DropdownMenu`). That is why it fits shadcn: shadcn gives you the parts, the headless table gives you the behaviour, and neither dictates the other's DOM.
- **Manual vs client mode.** Client mode (`getSortedRowModel`, `getPaginationRowModel`, `getFilteredRowModel`) is correct when the whole dataset is already in the browser and small (hundreds of rows, e.g. a dropdown-sized list). Manual (`manualPagination`, `manualSorting`, `manualFiltering`, `rowCount` from the API's `meta.total`) is correct when the server owns the data: sorting the 20 rows of page 3 client-side would be a lie ("sorted by price" but only within the page). Products (308 rows, 61 for a seller) and users are manual.
- **The URL is the state.** `validateSearch` (Zod) in the route defines `page`, `pageSize`, `sort`, `order`, `search`, `status`, `category`, `lowStock`; `.catch(default)` makes a hand-edited garbage value fall back instead of throwing. The route's `loaderDeps: ({ search }) => search` + `loader` prefetch the query for exactly those params; the component's `useQuery` uses the same key. `tableHandlers()` converts the table's `onSortingChange`/`onPaginationChange` (value-or-updater) into `navigate({ search })` patches. Verified in the browser: reload keeps filters/sort/page; Back/Forward walk through states (paging/sorting/filtering PUSH entries; only the debounced search box REPLACES; first version replaced everything and Back left the page: found by testing Back, fixed).
- **Filter change -> page 1.** `setFilter` always adds `page: 1`; changing the page size or the sort does too. `placeholderData: keepPreviousData` keeps the old rows (dimmed, `aria-busy`) while the next page loads: no empty flash. The debounced search keeps a `pushed` ref so that the URL echo of what I typed is not mistaken for navigation (otherwise typing "yo" while the URL says "y" overwrote the input).
- **Sticky header + scroll:** the scroll container is my own div; shadcn's `Table` wraps the `<table>` in an `overflow-x-auto` div which would become the scroll context and break `position: sticky`, so the CSS `[&_[data-slot=table-container]]:overflow-visible` neutralises it.
- **Server-side bits:** `GET /admin/products` / `/seller/products` take the same query (search is a partial match on name/sku/brand, `lowStock`), `GET .../export.csv` takes the same filters and ignores paging: the "Export CSV" button downloads the CURRENT FILTERED VIEW from the API (up to 5000 rows), not the page. Bulk "Archive selected" goes through `POST .../bulk` (confirmation dialog first; ids that are not yours do not match).
- **Row actions** are real links/buttons (`Edit`, `Archive`), inline price/stock are `<button>`s that turn into inputs (Enter/blur commit, Esc cancel) so the table is fully keyboard operable. Column visibility is in a dropdown (local state: it is a viewer preference, not something worth a URL).
- **Users table** (A.7 needs it, A.1-A.3 need role/status tools) uses the same `DataTable`: role change and deactivation behind an `AlertDialog`, own row disabled (the API also answers 409 `SELF_MODIFICATION`).
- **Deviation:** the plan says reuse `DataTable` for Products AND Orders; Orders arrive with A.4, so the second consumer today is Users.

### Router comparison row added in A.2

| Concern | React Router (storefront) | TanStack Router (admin) |
| --- | --- | --- |
| Search params | `useSearchParams()` -> `URLSearchParams`, every value a string; my storefront hand-parses them with Zod in a hook | `validateSearch` on the route: parsed, typed, defaulted, inherited by children; `Route.useSearch()` is typed; `<Link search={...}>` and `navigate({ search: prev => ... })` are checked against the schema; `loaderDeps` makes the loader depend on them |

## A.3 Catalog management: forms, uploads and optimistic edits

- **Backend that A.3 needed (built first, `backend B1 (admin)` commit):** `/admin/products` and `/seller/products` (create, patch, archive, bulk, CSV), `/admin/categories` (create, move, reorder, delete), `/admin/brands`. Products got an optional `variants[]` (sku, color, size, price, stock) because the real model had none; with variants `stock` is derived (sum) and the API refuses a `stock` edit (422).
- **Product form** (`features/products/ProductForm.tsx`): React Hook Form + `zodResolver(productFormSchema)`; tabs General / Pricing & stock / Variants / Images / Specs / SEO, all `keepMounted` so a field on a hidden tab is still registered and validated. `useFieldArray` for highlights, variants, specs and images. A tab whose fields have errors shows "(!)", and a failed submit jumps to the first such tab (an error on a hidden tab would otherwise look like "the button does nothing").
- **Money.** Rupees end to end as integers: inputs use `register(name, { valueAsNumber: true })`, the schema is `z.number().int("Whole rupees only")`. Observed: typing `99.5` shows "Whole rupees only" and nothing is sent; an empty field is `NaN` -> "Enter a price". The API re-checks (`int`, `price <= mrp`), prices are formatted only for display (`formatRupees`, `Intl` en-IN).
- **Server field errors on nested inputs.** The API answers 422 `details: [{ path: "variants.1.sku", message }]` and 409 `SKU_TAKEN` also with `details[0].path = "sku"`. `ApiError.fieldErrors` flattens them to `{ path: message }`, and the dotted path IS react-hook-form's field name, so `setError(path, { type: "server", message })` places each message under its input (`highlights.N` and `tags.N` are mapped to the form's own shapes in `serverPathToField`). Verified live: creating a product with the SKU of an existing one shows "That SKU is already used by another product" under SKU and opens/marks the Pricing tab.
- **Dirty state.** `useBlocker({ shouldBlockFn, enableBeforeUnload, withResolver: true })` with an `AlertDialog` (Keep editing / Discard), plus the browser's own `beforeunload` prompt. A successful save calls `reset(values)` (the saved values become the new baseline, so `isDirty` is false) and sets a ref so the post-create navigation to the edit page is not blocked. Verified: clicking a nav link with edits shows the dialog; saving then navigating does not.
- **Uploads** (`ImagesField.tsx`): each file goes alone to `POST /uploads/images` through `apiUpload` (XHR: `fetch` has no upload progress) with its own `AbortController`, `<progress>`, error and Retry. Verified by feeding two files to the input: a real PNG became an image row, a text file named `bad.png` failed with "Only JPEG, PNG and WebP images are accepted" (the server sniffs magic bytes, the file name proves nothing) while the good one stayed. Reorder with `dnd-kit` (`useSortable` rows, pointer AND keyboard sensors) writing to `useFieldArray.move`; first image = main.
- **Optimistic inline edit** (`useInlineProductEdit`): `onMutate` cancels in-flight list queries, snapshots every cached product list (`getQueriesData`) and patches the row in all of them; `onError` restores the snapshots and shows a toast with the server's reason; `onSettled` invalidates. Verified: stock `18499999999` (> API max) flashed, then rolled back to 184 with "Could not save stock: ..." (first version printed only "Validation failed"; now it lists the field messages).
- **Categories** (`CategoryManager`): tree from the flat list, Up/Down reorder (PUT /reorder with all siblings), Edit/move (parent select excludes self and descendants; the API also answers 422 on a cycle), Add child, Hide/Show, Delete (409 while not empty). **Brands**: table + create/rename dialog (rename rewrites `Product.brand`), delete refused while used (409 `BRAND_IN_USE`). **Duplicate product**: `/products/new?from=<id>` prefills as a draft with `-COPY` SKUs (the route `loader` reads the source through the same Query cache).
- **Not verified:** keyboard drag reorder in a real browser (the sensors are configured, I did not drive them), drag with a mouse, image removal of an already-saved image on the server (the file is not deleted, only the reference: the API has no delete-upload endpoint).
- **Deviation:** plan says tab "Pricing & stock" has price/stock; variant-level pricing exists but the storefront still sells the product at its base price (the cart/orders know nothing about variants: stated as a known limitation).
