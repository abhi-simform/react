# Backend Guide for a Frontend Developer

You write React for a living. This guide gives you just enough backend understanding to **read, run, debug and talk to** `backend/` — not to become a backend engineer.

## 1. The big picture

```
Browser (React app :5173)
   │  fetch("http://localhost:4000/api/v1/products?brand=Apple")
   ▼
Express API (:4000)  ──►  MongoDB (:27017, in Docker)
   │                       ▲
   └──► Mailpit (:1025)    └── Mongo Express (:8081) lets you look inside
```

- **Frontend** = UI + user state. **Backend** = rules, security, persistence. **Database** = the only place data survives a restart.
- The frontend can **never be trusted** (users can edit anything in DevTools), so the backend re-validates everything and enforces permissions and prices.

## 2. HTTP in 5 minutes

A request = method + URL + headers + optional body. A response = status + headers + body.

- `GET` read · `POST` create/act · `PUT/PATCH` update · `DELETE` remove.
- 2xx ok · 3xx redirect · 4xx _you_ (client) did something wrong · 5xx _we_ (server) failed.
- Open DevTools → **Network** tab → click any request. Everything above is visible there. Do this constantly.
- **Cookies** are headers the browser stores and re-sends automatically; `httpOnly` ones are invisible to JavaScript.
- **CORS**: browsers block JS on `localhost:5173` from reading responses from `localhost:4000` unless the API says "that origin is allowed" (`CORS_ORIGINS`). If you see a CORS error, it's almost always a wrong origin or missing `credentials: "include"` — not a server crash.

## 3. How the code is organised

```
src/
  server.ts        boots: connect DB → listen → graceful shutdown
  app.ts           builds the Express app (middleware order matters!)
  routes.ts        mounts each module under /api/v1/<name>
  config/          env validation, logger, db connection
  middleware/      reusable steps: auth, validate, errors, rate limits
  utils/           small helpers (ApiError, response envelope, tokens, email)
  modules/<feature>/
     *.model.ts       Mongoose schema = the shape of data in MongoDB (+ indexes)
     *.schema.ts      Zod schemas = what input is allowed (request validation)
     *.service.ts     business logic (the "rules"). No req/res in here.
     *.controller.ts  glue: read validated input → call service → send response
     *.routes.ts      URL + method → middleware chain → controller
  seed/            fake data generator
tests/             Vitest + Supertest (HTTP-level tests with an in-memory MongoDB)
```

**Rule of thumb:** routes say _where_, controllers say _how to talk HTTP_, services say _what the business does_, models say _what is stored_. A new feature = one new folder with those five files + one line in `routes.ts`. Compare to a React feature folder: it is the same separation-of-concerns idea.

### Request lifecycle (read `app.ts` top to bottom)

```
request → helmet (security headers) → cors → compression → request-id/logging
        → json body parser → cookie parser → rate limiter
        → route match → validate(zod) → authenticate → authorize(role) → controller → service → model → DB
        ← response envelope   (any thrown error jumps to errorHandler)
```

Middleware is just `(req, res, next) => …` functions in a chain — like a pipeline of `.map()`s over a request. **Express 5** automatically forwards errors thrown/rejected in `async` handlers to `errorHandler`, so controllers can simply `throw ApiError.notFound()`.

## 4. MongoDB / Mongoose crash course

- MongoDB stores **documents** (JSON-like) in **collections** (≈ tables). A Product document embeds `images[]`, `specs[]` directly — no joins needed for those.
- Relationships use **references**: `product.category` stores a Category `_id`. `.populate("category")` swaps the id for the document.
- **Embed** data that is read together and bounded (images, specs). **Reference** data that is shared/large/unbounded (reviews, orders).
- **Indexes** make queries fast (like an index in a book). See the bottom of `product.model.ts`: text index for search, compound indexes for filters. No index → full collection scan → slow at scale.
- **Aggregation pipelines** (`Model.aggregate([...])`) are `filter → group → sort → project` stages — exactly like chained `.filter().reduce().sort()` in JS. Used for analytics in later phases.
- **Transactions** make several writes all-or-nothing (placing an order must decrement stock _and_ create the order, or neither). They require a **replica set**, which is why `docker-compose.yml` starts Mongo as a one-node replica set.
- `lean()` returns plain JS objects (faster, read-only) instead of full Mongoose documents.

## 5. Authentication, step by step

1. **Register/Login**: password is hashed with **bcrypt** (never stored plain). Server returns a short-lived **access token** (JWT, 15 min) in JSON and a long-lived **refresh token** in an `httpOnly` cookie.
2. **Calling the API**: frontend sends `Authorization: Bearer <accessToken>`; the `authenticate` middleware verifies the signature and sets `req.user`.
3. **Expiry**: after 15 min the API replies `401 TOKEN_EXPIRED`; frontend calls `POST /auth/refresh` (cookie is sent automatically), gets a new access token, retries.
4. **Rotation + reuse detection**: each refresh invalidates the old refresh token and issues a new one. If an _old_ one is replayed (stolen), the whole login family is revoked.
5. **Why not just localStorage?** Anything JS can read, an XSS bug can steal. The refresh token is unreadable to JS; the access token is short-lived and held in memory.
6. **Authorization** ≠ authentication: `authorize("admin")` checks _role_; services also check _ownership_ ("is this order mine?").

## 6. Docker, minimally

Docker runs programs in isolated containers from **images**. We use it so you don't install/configure MongoDB on your Mac.

```bash
docker compose up -d        # start everything in the background
docker compose ps           # status
docker compose logs -f mongo
docker compose down         # stop (data survives in the named volume)
docker compose down -v      # stop AND delete data
docker compose exec mongo mongosh   # open a Mongo shell
```

The Node API runs on your host (`npm run dev`) for instant reload; Docker only hosts stateful services. `backend/Dockerfile` is how the API would be packaged for production.

## 7. Tools for poking the API

| Tool                                            | Use                                              |
| ----------------------------------------------- | ------------------------------------------------ |
| **Swagger UI** `http://localhost:4000/api/docs` | click-to-try endpoints; always in sync with code |
| **Mongo Express** `http://localhost:8081`       | browse/edit collections                          |
| **Mailpit** `http://localhost:8025`             | see verification/reset emails                    |
| **curl / Bruno / Postman**                      | scripted requests; `curl -i` shows headers       |
| **Browser Network tab**                         | the truth about what your React app sent         |
| `docker compose exec mongo mongosh shopsphere`  | `db.products.find({brand:"Apple"}).limit(3)`     |

Example session:

```bash
curl -s localhost:4000/api/v1/health
curl -s 'localhost:4000/api/v1/products?search=headphones&sort=price_asc&limit=3'
curl -s -c jar.txt -H 'content-type: application/json' \
  -d '{"email":"customer@shopsphere.dev","password":"Password123"}' localhost:4000/api/v1/auth/login
```

## 8. First 30 minutes checklist

- [ ] `docker compose up -d` → open Mongo Express and Mailpit.
- [ ] `cd backend && npm i && npm run seed && npm run dev`.
- [ ] Open Swagger UI, call `GET /products?limit=5`. Find the same data in Mongo Express.
- [ ] Register a user in Swagger → read the verification email in Mailpit → call `/auth/verify-email` with the token.
- [ ] Call `/users/me` without a token (401), then with one (200). Wait/force expiry and watch `TOKEN_EXPIRED`.
- [ ] Read `app.ts`, then trace `GET /products` through `product.routes.ts → controller → service → model`.
- [ ] Break something on purpose (send `minPrice=abc`) and read the 422 envelope.
- [ ] `npm test` — read `tests/auth.test.ts` to see every auth behaviour specified as code.

## 9. Working with Claude Code on the backend

- Ask for **one roadmap phase at a time** ("Build B3 — cart — following the existing module pattern"). Read the diff, run the tests, try it in Swagger **before** using it from React.
- When something is odd, ask "why does this work?" — e.g. why `req.valid` instead of `req.query` (Express 5 made `req.query` read-only).
- You own the contract: if the API shape is awkward for your UI, change `API-CONVENTIONS.md` first, then the code.

## 10. Glossary

**Endpoint** URL+method · **Middleware** pipeline step · **DTO/schema** allowed input shape · **ODM** Mongoose (objects ↔ documents) · **Index** lookup accelerator · **Replica set** DB cluster enabling transactions · **JWT** signed token · **TTL index** auto-expire documents · **Idempotent** safe to repeat (payments/webhooks) · **Rate limit** max requests per window · **Graceful shutdown** finish in-flight work before exiting.
