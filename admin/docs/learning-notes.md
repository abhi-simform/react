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
