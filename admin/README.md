# ShopSphere Admin (TanStack Start + Router + Query + Table + shadcn)

Admin and seller console for the ShopSphere API. Pages render in the browser only (`src/start.ts`: `defaultSsr: false`).

```bash
cp .env.example .env.local        # VITE_API_URL=http://localhost:4000/api/v1
npm install
npm run dev                       # http://localhost:3000 (the API's CORS allows it)
npm run typecheck && npm run lint && npm run build
```

Dev logins (after `npm run seed` in `/backend`): `admin@shopsphere.dev`, `seller@shopsphere.dev`, `seller2@shopsphere.dev` (password printed by the seed). A `customer@` login is refused by the shell.

Notes: `docs/learning-notes.md`, `docs/pain-journal.md`.
