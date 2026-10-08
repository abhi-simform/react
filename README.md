# ShopSphere

A production-style e-commerce platform (think Amazon / Flipkart) built to **learn React by implementation**.
Three independent projects in one repo — they deliberately share **no code or packages**.

| Folder | What | Stack | Who builds it | Port |
|---|---|---|---|---|
| [`frontend/`](frontend) | Customer storefront | React 19, React Router 8 (SPA mode), Tailwind 4, shadcn/ui | **You** (learning) | 5173 |
| [`admin/`](admin) | Admin / seller dashboard | TanStack Start + Router, shadcn/ui | Claude | 3000 |
| [`backend/`](backend) | REST API | Node 24, Express 5, TypeScript, MongoDB (Mongoose), Zod | Claude (phased) | 4000 |

Supporting services run in Docker ([`docker-compose.yml`](docker-compose.yml)): MongoDB (replica set), Mongo Express (DB browser), Mailpit (fake inbox), optional Redis.

## Start here

1. **Learning path →** [`learning-plan.md`](learning-plan.md) (stages, hands-on tasks, product spec, backend milestones)
2. **Backend mental models →** [`backend/docs/BACKEND-GUIDE.md`](backend/docs/BACKEND-GUIDE.md)
3. **API contract for your frontend →** [`backend/docs/API-CONVENTIONS.md`](backend/docs/API-CONVENTIONS.md)
4. **What Claude builds next →** [`backend/docs/BACKEND-ROADMAP.md`](backend/docs/BACKEND-ROADMAP.md)

## First-time setup

### 0. One repo, three folders
`frontend/` and `admin/` were scaffolded with their own `.git` folders. Fold them into one repo (this wipes their 1-commit histories):

```bash
cd /Users/abhishek/Documents/Projects/React
rm -rf frontend/.git admin/.git
git init && git add -A && git commit -m "chore: initial ShopSphere monorepo"
```

### 1. Infrastructure (Docker)
```bash
docker compose up -d          # mongo + mongo-express + mailpit
docker compose ps             # mongo should become "healthy" in ~10-20s
```
| Service | URL |
|---|---|
| MongoDB | `mongodb://localhost:27017/?replicaSet=rs0` |
| Mongo Express (browse data) | http://localhost:8081 |
| Mailpit (see emails the API sends) | http://localhost:8025 |

### 2. Backend
```bash
cd backend
cp .env.example .env          # already done once for you; edit if needed
npm install
npm run seed                  # ~300 products, category tree, 3 dev users
npm run dev                   # http://localhost:4000/api/v1/health
```
Interactive API docs: http://localhost:4000/api/docs
Dev logins (created by the seed — see `backend/src/seed/index.ts`): `customer@shopsphere.dev`, `seller@shopsphere.dev`, `admin@shopsphere.dev`.

### 3. Frontend / Admin
```bash
cd frontend && npm install && npm run dev     # http://localhost:5173
cd admin    && pnpm install && pnpm dev       # http://localhost:3000
```
> `frontend` runs in **SPA mode** (`ssr: false` in `frontend/react-router.config.ts`) so you learn client-side data fetching first. The learning plan has a final stage that turns SSR back on.

## Daily commands

| Task | Command |
|---|---|
| Start/stop infra | `docker compose up -d` / `docker compose down` |
| Wipe all DB data | `docker compose down -v` then `up -d` and `npm run seed` |
| Reseed from scratch | `cd backend && npm run db:reset` |
| Backend tests / lint / typecheck | `npm test` / `npm run lint` / `npm run typecheck` |
| Add Redis (later phases) | `docker compose --profile cache up -d` |
| Run the API in Docker (prod-like) | `docker compose --profile app up -d --build` |

## Ports cheat-sheet
`5173` storefront · `3000` admin · `4000` API · `27017` MongoDB · `8081` Mongo Express · `8025` Mailpit inbox · `1025` SMTP · `6379` Redis

## Troubleshooting
* **Mongo container restarts forever with "Linux kernel versions 6.19 and newer…"** — MongoDB 8.x refuses to run on very new Docker VM kernels ([SERVER-121912](https://jira.mongodb.org/browse/SERVER-121912)). That's why `docker-compose.yml` pins **`mongo:7.0`** (fully supports replica sets/transactions). Move to 8.x once MongoDB ships the fix.
* **`MongoServerSelectionError` from the API** — Mongo isn't healthy yet (`docker compose ps`), or `MONGODB_URI` in `backend/.env` is wrong.
* **CORS error in the browser** — your frontend origin isn't in `CORS_ORIGINS`, or the request lacks `credentials: "include"`.
