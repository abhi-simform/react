# Admin track checkpoint: model answers

**1. How does a file path become a route in TanStack Router, and how does React Router config differ?**
Each file under `src/routes/` is a route and the generator (`tsr generate`, the Vite plugin) writes `routeTree.gen.ts`. The name is the path: `index` is `/`, `$param` a dynamic segment, a leading underscore (`_authed`) a pathless layout (guard + shell, no URL cost), a dot or folder nests (`products/$productId` = `/products/:productId`), `route.tsx` is a folder's layout. Each file calls `createFileRoute("<its path>")`, and that string is type-checked against the generated tree, so `Link`, params, search and context are inferred end to end. React Router (storefront) uses an explicit config (`routes.ts` listing `route(path, file)`), params and search are loosely typed strings, and guards are loaders or wrapper components rather than a `beforeLoad` that returns typed context.

**2. What does "headless" mean for TanStack Table and why does it suit shadcn?**
It computes state and row models (sorting, pagination, selection, visibility, headers) and renders nothing. I own the markup (`<table>`, `<caption>`, `aria-sort`), shadcn supplies styled primitives; neither dictates the other's DOM. With `manualPagination/Sorting/Filtering` the server does the work and the URL owns the state.

**3. Why must seller isolation be enforced by the API, and how did you prove it?**
The UI only hides things; a console `fetch` or a hand-typed URL ignores it. The API filters by owner inside the service, so another seller's product is 404 (indistinguishable from missing), admin endpoints are 403, and a seller's analytics/orders cover only their own lines. Proof: backend tests (`b1.admin`, `b11.orders`, `b11.analytics`), curl with seller tokens (404/403, different revenue numbers per seller), and the Playwright seller spec (API 404, UI "not found", `/users` forbidden, no customer e-mails in the seller's orders).

**4. Why keep table state in the URL?**
Reload, back/forward and shared links all restore the exact view; the API query derives from it (single source of truth); `validateSearch` types and sanitises it (`.catch` defaults); filter changes reset to page 1; only the debounced search REPLACES history, everything else pushes.

**5. How do you make a refund idempotent end to end?**
The dialog creates one UUID when it opens and sends it as `Idempotency-Key` on every submit from it; the button disables while in flight. The server stores the key on the refund entry: a repeat returns the first result (`Idempotent-Replayed`, no second audit row), the same key with another amount is 422, simultaneous requests are separated by a guarded write on the `refunds` array length, over-refunding is 409. Verified: three synchronous clicks produced one refund and one audit row.

**6. When would you pick TanStack Start over React Router framework mode?**
When you want its server side: SSR/streaming, server functions (`createServerFn`) and typed end-to-end data without a separate API, or you already live in TanStack Router/Query. Here the console is a logged-in, client-rendered tool (token in browser memory), so I used Start in SPA mode and it behaved as a Vite + Router app emitting static files; React Router framework mode would have been equally fine, and for a public SEO site with its own API I would choose per rendering needs, not per library.
