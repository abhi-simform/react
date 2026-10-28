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
