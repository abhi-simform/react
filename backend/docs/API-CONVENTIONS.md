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
| 409    | `EMAIL_TAKEN` `DUPLICATE_KEY` `CONFLICT` `ALREADY_VERIFIED` `NO_PASSWORD`    | Uniqueness/state conflict. Show a field error.                                                                                   |
| 413    | `PAYLOAD_TOO_LARGE`                                                          | Body > 1 MB.                                                                                                                     |
| 422    | `VALIDATION_ERROR`                                                           | Field errors in `error.details`: `[{ in: "body", path: "email", message: "Invalid email address" }]`. Map `path` to form fields. |
| 429    | `RATE_LIMITED` `AUTH_RATE_LIMITED` `RESEND_COOLDOWN`                         | Back off; show "try again later".                                                                                                |
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

### Cart (B3)

One cart per user **or** per guest token. Every cart endpoint accepts **either** `Authorization: Bearer <accessToken>` (the user's cart) **or** `x-cart-token: <token>` (a guest cart). The token is a random id **you generate once** (`crypto.randomUUID()`, 16-64 chars of `A-Za-z0-9_-`) and keep in `localStorage`; it names a cart, it is not a credential. Neither header: `400 CART_TOKEN_REQUIRED`. A Bearer header that is invalid/expired is `401` (it is never silently downgraded to a guest, so the client refreshes and retries). Guest carts expire 30 days after their last write (Mongo TTL). Reading never creates a cart: an unknown token is an empty cart.

Every endpoint below returns the **cart view** (the whole fresh cart, so a mutation response can be written straight into the Query cache):

```jsonc
{
  "items": [Line],   // the live cart
  "saved": [Line],   // "saved for later"
  "totals": { "lineCount", "unitCount", "subtotal", "mrpTotal", "savings" },  // whole rupees, live lines only
  "hasIssues": true, // any live line is outOfStock / qtyReduced / priceChanged
  "updatedAt": "..."
}
// Line:
{ "productId", "sku", "slug", "name", "brand", "imageUrl|null", "qty",
  "unitPrice", "mrp",                 // CURRENT price (rupees)
  "availableQty", "payableQty",       // payableQty = min(qty, availableQty): what totals count
  "outOfStock", "qtyReduced", "priceChanged", "previousPrice",  // warnings, recomputed on EVERY read
  "savedForLater", "addedAt" }
```

Totals deliberately stop at `subtotal / mrpTotal / savings`: shipping, tax and coupons are not server rules yet (coupons arrive with B4, orders with B5), so the client derives those from the server's lines.

| Method | Path                                              | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/cart`                                           | The cart view. Flags answer "did anything change since I added it?": `priceChanged` (+`previousPrice`), `qtyReduced` (`availableQty < qty`), `outOfStock` (stock 0 or product archived). There is no separate validate call: revalidation is just a fresh GET.                                                                                                                                                                                            |
| POST   | `/cart/items` `{productId, qty=1}`                | Adds; an existing line is **incremented** (and a saved line returns to the cart). `201` cart view. Limit per line = `min(stock, 10)`: `409 INSUFFICIENT_STOCK` with `details: { availableQty, requested, inCart }` (never a silent clamp). `409 CART_FULL` at 50 lines. `404` unknown/archived product. `422` bad id/qty. The increment is one conditional update: parallel adds cannot overshoot the stock.                                              |
| PATCH  | `/cart/items/:productId` `{qty?, savedForLater?}` | Set the quantity and/or move between cart and saved. At least one field (`422` otherwise). Stock is re-checked whenever a line is (or becomes) a live cart line (`409 INSUFFICIENT_STOCK`). `404` if the product is not in this cart.                                                                                                                                                                                                                     |
| DELETE | `/cart/items/:productId`                          | Idempotent remove (`200` cart view even if it was not there).                                                                                                                                                                                                                                                                                                                                                                                             |
| DELETE | `/cart`                                           | Empty the cart (saved lines too).                                                                                                                                                                                                                                                                                                                                                                                                                         |
| POST   | `/cart/acknowledge-prices`                        | "I have seen the new prices": snapshots every line at the current price, clearing `priceChanged`.                                                                                                                                                                                                                                                                                                                                                         |
| POST   | `/cart/merge` `{guestToken}`                      | **Bearer required.** After login: fold the guest cart into the user's cart and delete it, in one transaction. Same product: quantities add, capped at `min(stock, 10)`; new product: copied (with its saved flag); unavailable / out-of-stock products are skipped. Response = cart view + `merge: { merged, adjusted: [{productId,name,requested,applied}], skipped: [{productId,name,reason}] }`. Safe to call twice (second call finds no guest cart). |

Dev customer's seeded cart: 2 live lines (one whose price has dropped since it was added) and 1 saved line.

### Image upload (B7, upload slice)

`POST /uploads/images` (Bearer). `multipart/form-data` with exactly one file in the field **`file`**. Do not set `Content-Type` yourself in the browser (the boundary is added automatically).

- `201` -> `{ key, url, contentType, bytes }`. `url` is an absolute, public, immutable URL (store it, e.g. `PATCH /users/me { avatarUrl }`).
- Accepted: JPEG, PNG, WebP, decided from the **file's first bytes**, not the file name or the declared type. Max `UPLOAD_MAX_BYTES` (2 MB default).
- Errors: `401 UNAUTHORIZED`, `413 FILE_TOO_LARGE`, `415 UNSUPPORTED_FILE_TYPE`, `422 VALIDATION_ERROR` (`details[0].path === "file"`: no file, or more than one), `429 UPLOAD_RATE_LIMITED` (30/min).
- Files are written to `UPLOAD_DIR` (default `backend/uploads/`, git-ignored) under a generated name `<userId>-<uuid>.<ext>` and served from `GET /uploads/<name>` (outside `/api/v1`, `nosniff`, cached 7 days).
- Storage sits behind the `ImageStorage` interface (`modules/uploads/storage.ts`, one method `save`). Cloudinary/S3 = a second class returning the provider's URL; no route or test changes. Needs from the owner at that point: `CLOUDINARY_URL` (or key/secret) and the adapter class (not built: out of scope without credentials).
- One file per request on purpose: the client uploads images one at a time, gets per-file progress/cancel/retry, and puts the returned URLs in the form payload.
- Reviews, Q&A and moderation (the rest of B7) are NOT built yet; they arrive in Stage 11.

### Auth hardening, Google sign-in and sessions (B10)

B0 already had register/login/refresh(rotation + reuse detection)/logout/verify/forgot/reset/change-password. B10 adds the rest and tightens the email flows. 2FA (optional in the roadmap) is not built.

**User shape** gained `providers: ("password"|"google")[]`.

| Method | Path                                       | Notes                                                                                                                                                                                                    |
| ------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/verify-email` `{token}`             | `200 { message, alreadyVerified }`. The same link twice is `alreadyVerified: true` (not an error). `400 INVALID_TOKEN` (unknown) or `400 TOKEN_EXPIRED` (24 h; offer a resend).                          |
| POST   | `/auth/resend-verification`                | Bearer. `409 ALREADY_VERIFIED`; `429 RESEND_COOLDOWN` with `details.retryAfterSeconds` (60 s between mails).                                                                                             |
| POST   | `/auth/forgot-password` `{email}`          | Identical `200` for known/unknown emails; mail only goes to real accounts (Mailpit http://localhost:8025).                                                                                               |
| POST   | `/auth/reset-password` `{token, password}` | `400 INVALID_TOKEN` (also: already used) / `400 TOKEN_EXPIRED` (1 h) / `422`. Revokes **every** session, marks the email verified, clears the cookie.                                                    |
| POST   | `/auth/change-password`                    | Bearer + the refresh cookie. Revokes the **other** sessions; this one stays signed in. `401 INVALID_CREDENTIALS`, `409 NO_PASSWORD` for Google-only accounts (they use "Forgot password" to set one).    |
| GET    | `/auth/sessions`                           | Bearer (+ cookie). `[{ id, device, userAgent, ip, startedAt, lastActiveAt, current }]`. `id` is the refresh-token family; it survives rotation. `current` is true for the session whose cookie was sent. |
| DELETE | `/auth/sessions/:id`                       | Bearer. `204`; the session's next refresh is `401`. `404` for unknown or someone else's id, `422` for a non-uuid. Revoking the current one also clears the cookie.                                       |
| POST   | `/auth/logout-all`                         | Bearer. `204`, every session revoked, cookie cleared.                                                                                                                                                    |
| GET    | `/seller/me`                               | Bearer, role `seller`/`admin`. Placeholder until B11 so role gating can be tested end to end: `401` anonymous, `403 FORBIDDEN` customer, `200 { sellerId, role, productCount }`.                         |
| GET    | `/auth/google?redirect=/path`              | **Browser navigation.** 302 to Google.                                                                                                                                                                   |
| GET    | `/auth/google/callback`                    | Google's redirect target. 302 to `CLIENT_URL/auth/google/callback?...` (below).                                                                                                                          |

A revoked session cannot refresh, but the access token it already holds stays valid until it expires (15 min): that is the cost of stateless JWTs.

**Google flow** (server-side authorization code; the browser never sees Google's tokens or the client secret):
`GET /auth/google` -> sets httpOnly `oauthState` cookie (path `/api/v1/auth/google`, 10 min: nonce + safe redirect) -> 302 Google with `state=<nonce>` -> Google -> `GET /auth/google/callback?code&state` -> state must match the cookie, code is exchanged server-side, user is found/linked/created, the **refresh cookie is set**, 302 to the SPA:

- success: `/auth/google/callback?redirect=/orders/123` plus `created=1` (new account) and/or `linked=1` (linked to an existing account). The SPA then calls `POST /auth/refresh` like on any reload to get the access token.
- failure: `/auth/google/callback?error=<code>[&redirect=...]`, `code` one of `access_denied` (user cancelled), `invalid_state`, `email_not_verified` (Google says the email is unverified), `account_disabled`, `google_failed`, `google_not_configured`.
- `redirect` is only ever a same-site relative path (`/x`; `//evil.com`, `https://...`, backslashes collapse to `/`).

**Account linking:** a known Google id signs in. Otherwise an existing account with the same email is linked (only because Google verified the email) and becomes verified. If that local account had never verified its email, its password and sessions are **removed** at linking time (defence against someone who pre-registered the victim's address); otherwise the password keeps working. No account: one is created (verified, no password).

**Mock Google (no credentials needed).** With `GOOGLE_CLIENT_ID`/`SECRET` empty and `NODE_ENV != production`, `/auth/google` redirects to `GET /auth/google/mock`, a plain form where you type an email/name, tick "verified", and Continue or Cancel; it feeds the same callback code path (state check, linking, cookies, redirects). `GOOGLE_MOCK=false` turns it off, `true` forces it (never in production). With neither mock nor credentials the callback page gets `error=google_not_configured`.

**What the owner supplies for real Google:**

1. Google Cloud console -> APIs & Services -> OAuth consent screen (External, add yourself as a test user while in "Testing").
2. Credentials -> Create credentials -> OAuth client ID -> type **Web application**.
3. Authorized redirect URI: `http://localhost:4000/api/v1/auth/google/callback` (in production: `https://<api-host>/api/v1/auth/google/callback`, and set `GOOGLE_REDIRECT_URI` to the same value). No JavaScript origins needed (the browser never calls Google's APIs).
4. Put the client ID and secret in `backend/.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; restart the backend. The mock switches itself off. In production over HTTPS also set `COOKIE_SECURE=true` and, if the SPA is on another site, `COOKIE_SAMESITE=none` (the state cookie stays Lax, which is enough for a top-level redirect).
   Scopes requested: `openid email profile`. Nothing was tested against real Google (no credentials in this environment).

New endpoints are appended here as each backend phase lands (see `BACKEND-ROADMAP.md`).
