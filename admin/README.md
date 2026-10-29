# ShopSphere Admin

Admin and seller console for the ShopSphere API: TanStack Start (client-rendered SPA) + Router + Query + Table, shadcn on base-ui, React Hook Form + Zod, Recharts. It shares **no code** with `/frontend` (see `docs/pain-journal.md`).

## Screens

Dashboard (KPIs, revenue, status, top products, category share, funnel, low stock) - Orders (filters, detail, timeline, ship/cancel/refund, notes, CSV, live new-order push) - Returns queue - Products (table, form with variants/images/specs, inline edits) - Categories, Brands - Users - Sellers (applications, detail) - Coupons, Deals, Banners - Reviews and Q&A moderation (keyboard `j/k/a/r`) - Audit log (before/after diff) - System health - Settings. A `seller` sees only their own products, order lines and numbers (enforced by the API).

## Run

```bash
docker compose up -d              # MongoDB + Mailpit (repo root)
cd backend && npm run seed && npm run dev      # API on :4000
cd admin && cp .env.example .env.local         # VITE_API_URL=http://localhost:4000/api/v1
npm install && npm run dev                     # http://localhost:3000
```

Dev logins (password `Password123`): `admin@`, `seller@`, `seller2@shopsphere.dev`. `customer@` is refused by the shell. Both apps are on `localhost`, so they share the refresh cookie: use two browser profiles (or Playwright contexts) when testing both.

## Scripts

| | |
| --- | --- |
| `npm run typecheck` / `lint` / `format:check` | static checks |
| `npm test` | Vitest + Testing Library + MSW + axe (`src/**/*.test.ts(x)`) |
| `npm run e2e` | Playwright against the real stack (API, admin, storefront build): cross-app product flow, access/seller isolation, axe on login, dashboard, orders, product form |
| `npm run build` | `dist/client` (static SPA with `_shell.html`) |

## Deploy

Static files behind nginx (`Dockerfile`, `nginx.conf`, ~7 MB image, no Node at runtime):

```bash
docker build -t shopsphere-admin --build-arg VITE_API_URL=https://api.example.com/api/v1 .
docker run --rm -p 3000:8080 shopsphere-admin
```

- `VITE_API_URL` is a **build** argument (inlined by Vite).
- The API's `CORS_ORIGINS` must include the admin's origin. On a different site than the API set `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true` (or serve both under one registrable domain and set `COOKIE_DOMAIN`).
- CI: `.github/workflows/admin-ci.yml` (checks, e2e, docker).

## Notes

`docs/learning-notes.md` (per topic), `docs/pain-journal.md` (cost of copying), `docs/checkpoints/admin.md`, `docs/lighthouse.md`.
