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

| Method    | Path                                                                | Auth   | Purpose                                   |
| --------- | ------------------------------------------------------------------- | ------ | ----------------------------------------- |
| GET       | `/health`                                                           | –      | liveness + DB                             |
| POST      | `/auth/register` `/auth/login` `/auth/refresh` `/auth/logout`       | –      | session lifecycle                         |
| POST      | `/auth/verify-email` `/auth/forgot-password` `/auth/reset-password` | –      | email flows (see Mailpit :8025)           |
| POST      | `/auth/resend-verification` `/auth/change-password`                 | Bearer |                                           |
| GET/PATCH | `/users/me`                                                         | Bearer | profile                                   |
| GET       | `/categories`                                                       | –      | nested tree, `productCount` per node      |
| GET       | `/categories/:slug`                                                 | –      | detail + breadcrumb `ancestors`, children |
| GET       | `/brands?category=slug`                                             | –      | brands with counts                        |
| GET       | `/products`                                                         | –      | list / search / filter / sort / paginate  |
| GET       | `/products/:idOrSlug`                                               | –      | detail (with category breadcrumb path)    |

### Catalog (B1)

- `GET /categories` -> `[{ id, name, slug, image, productCount, children: [...] }]`. `productCount` counts active products in the node **and all descendants**.
- `GET /categories/:slug` -> `{ id, name, slug, image, parent, ancestors: [{id,name,slug}] (root first, use for breadcrumbs), children: [{id,name,slug,image,productCount}], productCount }`. Unknown or inactive slug: 404.
- `GET /brands` (optional `?category=slug`, subtree) -> `[{ name, count }]` sorted by name. Unknown category: `[]`.
- `GET /products?facets=true` adds `meta.facets` (opt-in, it costs four extra aggregations):

```jsonc
"facets": {
  "brands": [{ "value": "Apple", "count": 12 }],      // sorted by count desc
  "price": { "min": 499, "max": 129999 },
  "rating": [{ "value": 4, "count": 80 }, ...],        // "4 stars & up" for 4,3,2,1
  "inStock": { "count": 150 }
}
```

Facets are **disjunctive**: each one is computed with every active filter EXCEPT its own, so after ticking Apple the Samsung count still shows how many Samsung products match the other filters (search, category, price, rating, stock). Otherwise ticking one brand would zero every other brand and the user could never widen the OR. `price` ignores `minPrice/maxPrice` so the slider keeps its full range.

### Wishlist, addresses, delivery (B2)

All wishlist and address endpoints need `Authorization: Bearer <accessToken>` (401 otherwise). Dev customer: `customer@shopsphere.dev` / `Password123` (seeded with 2 addresses + 3 wishlisted products).

| Method | Path                        | Notes                                                                                                                                                                                                                                                                                                                                                                                    |
| ------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/wishlist?page&limit`      | Product **card shape** (same as `/products` list items) + `wishlistedAt`, newest first, `meta` = PageMeta. Inactive products hidden.                                                                                                                                                                                                                                                     |
| GET    | `/wishlist/ids`             | `string[]` of product ids, newest first. Cheap: load once to paint every heart.                                                                                                                                                                                                                                                                                                          |
| POST   | `/wishlist` `{ productId }` | **Idempotent**: `201` first time, `200` if already there. `404` unknown/inactive product, `422` malformed id. Returns `{ productId }`.                                                                                                                                                                                                                                                   |
| DELETE | `/wishlist/:productId`      | **Idempotent**: always `204`, even if it was not wishlisted (calling twice is safe).                                                                                                                                                                                                                                                                                                     |
| GET    | `/addresses`                | Default first, then newest. Max 10 per user.                                                                                                                                                                                                                                                                                                                                             |
| POST   | `/addresses`                | Body: `fullName phone line1 line2? landmark? city state pincode type(home/work/other) isDefault?`. `201` Address. First address is always default; `isDefault:true` demotes the previous default. `409 ADDRESS_LIMIT` at 10. `422` for bad phone/pincode **and for unserviceable pincodes** (`details[0].path === "pincode"`).                                                           |
| PATCH  | `/addresses/:id`            | Any subset of the create fields (not `isDefault`). `422` on empty body. `404` for missing **or someone else's** address.                                                                                                                                                                                                                                                                 |
| POST   | `/addresses/:id/default`    | Makes it the default; the previous default is demoted atomically (a partial unique index guarantees one default per user).                                                                                                                                                                                                                                                               |
| DELETE | `/addresses/:id`            | `200 { deletedId, newDefaultId }`. **Deleting the default auto-promotes the newest remaining address** (`newDefaultId`), `null` if none left. Second delete is `404` (not idempotent, unlike the wishlist).                                                                                                                                                                              |
| GET    | `/pincodes/:pincode`        | Public. `{ pincode, serviceable, zone: metro/standard/remote, state, codAvailable, deliveryDays:{min,max}, estimatedDelivery:{from,to} }`, or `{ pincode, serviceable:false }`. Malformed (not `[1-9]\d{5}`) is `422`. Mock zone table (no real logistics provider): `560/110/400/...` metro 1-2 days, `79/78` remote 6-9 days no COD, `193/194/744` unserviceable. Sundays are skipped. |

Address shape: `{ id, fullName, phone, line1, line2|null, landmark|null, city, state, pincode, type, isDefault, createdAt, updatedAt }`.

New endpoints are appended here as each backend phase lands (see `BACKEND-ROADMAP.md`).
