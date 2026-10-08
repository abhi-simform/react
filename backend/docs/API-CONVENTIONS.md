# API Conventions (your contract as the frontend developer)

Base URL (dev): `http://localhost:4000/api/v1` · Interactive docs: `http://localhost:4000/api/docs`

## 1. Response envelope

Every JSON response has the same shape, so your frontend can write **one** API client.

```jsonc
// success
{ "success": true, "data": <anything>, "meta": { /* only for lists */ } }

// failure
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": [ ... ] } }
```

TypeScript you can paste into the frontend:

```ts
export type ApiSuccess<T, M = undefined> = { success: true; data: T; meta?: M }
export type ApiFailure = {
  success: false
  error: { code: string; message: string; details?: unknown }
}
export type PageMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}
```

`204 No Content` responses (e.g. logout) have no body.

## 2. Status codes & error codes

| Status | `error.code`                                                                 | Meaning / what the UI should do                                                                                                  |
| ------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `BAD_REQUEST`                                                                | Malformed request (bad ObjectId, bad JSON). Usually a bug.                                                                       |
| 401    | `UNAUTHORIZED`                                                               | No token. Send user to login.                                                                                                    |
| 401    | `TOKEN_EXPIRED`                                                              | Access token expired → call `POST /auth/refresh`, then **retry once**.                                                           |
| 401    | `INVALID_TOKEN` / `INVALID_CREDENTIALS`                                      | Bad token / wrong email or password.                                                                                             |
| 401    | `NO_REFRESH_TOKEN` `INVALID_REFRESH_TOKEN` `SESSION_EXPIRED` `REFRESH_REUSE` | Session is over → clear auth state, go to login.                                                                                 |
| 403    | `FORBIDDEN`                                                                  | Logged in but not allowed (wrong role).                                                                                          |
| 404    | `NOT_FOUND`                                                                  | Missing resource or unknown route.                                                                                               |
| 409    | `EMAIL_TAKEN` `DUPLICATE_KEY` `CONFLICT`                                     | Uniqueness/state conflict. Show a field error.                                                                                   |
| 413    | `PAYLOAD_TOO_LARGE`                                                          | Body > 1 MB.                                                                                                                     |
| 422    | `VALIDATION_ERROR`                                                           | Field errors in `error.details`: `[{ in: "body", path: "email", message: "Invalid email address" }]`. Map `path` to form fields. |
| 429    | `RATE_LIMITED` `AUTH_RATE_LIMITED`                                           | Back off; show "try again later".                                                                                                |
| 5xx    | `INTERNAL_ERROR`                                                             | Our bug. Show generic error + retry.                                                                                             |

## 3. Authentication

- `POST /auth/register` and `POST /auth/login` return `{ user, accessToken }` and set an **httpOnly `refreshToken` cookie** (path `/api/v1/auth`).
- Send the access token on protected calls: `Authorization: Bearer <accessToken>`. It lives **15 minutes**.
- Keep the access token **in memory** (a variable / context), never `localStorage`. On page load call `POST /auth/refresh` to restore the session from the cookie.
- **All requests that rely on the cookie need `credentials: "include"`** (`fetch`) / `withCredentials: true` (axios). CORS is already configured for `http://localhost:5173` and `:3000` with credentials.
- `POST /auth/refresh` **rotates** the cookie every call. Don't fire two refreshes in parallel — queue them (a classic learning exercise in the plan).
- Roles: `customer` (default), `seller`, `admin`.

## 4. Lists: pagination, filtering, sorting

Query-string contract used by every list endpoint:

| Param    | Example                                                                                       | Notes                                                                                                  |
| -------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `page`   | `page=2`                                                                                      | 1-based, default 1                                                                                     |
| `limit`  | `limit=20`                                                                                    | default 20, max 60                                                                                     |
| `sort`   | `sort=price_asc`                                                                              | per-endpoint enum (products: `relevance, price_asc, price_desc, newest, rating, discount, popularity`) |
| `search` | `search=iphone`                                                                               | full-text, ranked by relevance                                                                         |
| filters  | `brand=Apple,Samsung&minPrice=10000&maxPrice=50000&minRating=4&inStock=true&category=mobiles` | comma-separated = OR within one filter                                                                 |

Response: `data` = array, `meta` = `PageMeta`. Stable ordering is guaranteed across pages.

## 5. Conventions

- JSON in/out, `camelCase` keys; ids are Mongo ObjectId strings in `_id` (lists/detail) or `id` (users).
- Money: **integers in INR rupees** (`price: 59999`). Format with `Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })`. Never do float math on money.
- Dates: ISO 8601 UTC strings.
- Unknown body/query keys are silently stripped; wrong types are rejected with 422.
- Request ids: each response carries `x-request-id`; quote it when debugging in the backend logs.

## 6. Endpoints available now (B0)

| Method    | Path                                                                | Auth   | Purpose                                  |
| --------- | ------------------------------------------------------------------- | ------ | ---------------------------------------- |
| GET       | `/health`                                                           | –      | liveness + DB                            |
| POST      | `/auth/register` `/auth/login` `/auth/refresh` `/auth/logout`       | –      | session lifecycle                        |
| POST      | `/auth/verify-email` `/auth/forgot-password` `/auth/reset-password` | –      | email flows (see Mailpit :8025)          |
| POST      | `/auth/resend-verification` `/auth/change-password`                 | Bearer |                                          |
| GET/PATCH | `/users/me`                                                         | Bearer | profile                                  |
| GET       | `/categories`                                                       | –      | nested tree                              |
| GET       | `/products`                                                         | –      | list / search / filter / sort / paginate |
| GET       | `/products/:idOrSlug`                                               | –      | detail (with category breadcrumb path)   |

New endpoints are appended here as each backend phase lands (see `BACKEND-ROADMAP.md`).
