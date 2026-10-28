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

### Coupons, deals, server time, banners (B4)

Money stays whole rupees. The cart view (every cart response) gained: `totals.{discount, shipping, tax, total}` (free shipping strictly above Rs 499 on the discounted subtotal, otherwise Rs 40; tax 18% exclusive, rounded once), `coupon` and per-line `deal`.

| Method | Path                                                   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/cart/coupon` `{code}`                                | **Bearer required** (usage limits are per person). Codes are case-insensitive. `200` = cart view with `coupon: { code, description, discount }`. `422 COUPON_INVALID` with `details.reason`: `UNKNOWN`, `NOT_STARTED`, `EXPIRED`, `MIN_ORDER` (+ `minOrder`, `shortBy`), `ALREADY_USED`, `NOT_APPLICABLE` (category coupon, no eligible lines), `EXHAUSTED`, `FIRST_ORDER_ONLY`, `EMPTY_CART`. Applying replaces an earlier coupon. |
| DELETE | `/cart/coupon`                                         | Bearer. Idempotent.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| GET    | `/coupons/available`                                   | Bearer or `x-cart-token`. Live coupons each checked against the cart: `applicable`, `discount`, `reason`, `message`.                                                                                                                                                                                                                                                                                                                |
| GET    | `/deals?status=active\|upcoming&category=<slug>&limit` | Public. `data[]` = `{ id, dealPrice, startsAt, endsAt, stockLimit, claimed, remaining, badge, discountPercent, status, product: {id,name,slug,brand,imageUrl,price,mrp,stock,category,ratingAvg,ratingCount} }`, `meta.now` = server clock. Poll it for the "claimed" bar.                                                                                                                                                                                |
| GET    | `/time`                                                | `{ now, epochMs }`, `Cache-Control: no-store`.                                                                                                                                                                                                                                                                                                                                                                                      |
| GET    | `/banners?placement=hero\|strip`                       | Public; only active banners inside their optional window, by `sortOrder`.                                                                                                                                                                                                                                                                                                                                                           |
| *      | `/admin/coupons`, `/admin/deals`, `/admin/banners`     | Admin only (`403` otherwise): list, create, `PATCH /:id`, deals/banners `DELETE /:id`. Deal price must be below the regular price (`400`); a banner `linkUrl` must be a same-site path (`//evil.com` is `422`).                                                                                                                                                                                                                     |

Rules worth knowing:

- **The cart stores only the coupon CODE.** Rules are re-evaluated on every cart read; if the coupon stops applying (expired, minimum no longer met, used up) the cart returns `coupon: { code, error: { reason, message } }` and `totals.discount = 0` instead of failing. Percent discounts round down; a coupon never discounts more than its eligible lines; `maxDiscount` caps percent coupons.
- **Per-user and first-order rules** read the user's orders (cancelled ones do not count); the global `usageLimit` is claimed atomically when an order is placed (B5) and released on cancel.
- **Deals.** A deal is live when `startsAt <= now < endsAt`, `isActive` and units are left (`claimed < stockLimit`), judged by the server clock. While live: `GET /products` rows and `GET /products/:id` carry `deal: { id, dealPrice, endsAt, remaining, ... }` (else `null`; `price` stays the regular price), and the cart prices a line at the deal price when `remaining >= qty`. When it ends the next read returns the regular price (and `priceChanged: true` if the shopper added it at the deal price). Overlapping deals: cheapest wins.
- Seed: coupons `SAVE10`, `FLAT100`, `WELCOME50` (first order), `TECH15` (Electronics only), `OLD50` (expired), `LASTONE` (1 use total); 10 live deals (one nearly sold out), 1 upcoming, 3 hero banners.

### Orders (B5)

Money is whole rupees. `Order` = `{ id, orderNumber ("SS-YYYYMMDD-XXXXXX"), userId, items:[{productId, sku, title, image, unitPrice, mrp, qty, lineTotal, deal}], addressSnapshot, delivery:{method, slot, estimatedFrom, estimatedTo}, status, statusHistory:[{status, at, note}], pricing:{subtotal, discount, shipping, tax, total}, coupon:{code,discount}|null, paymentMethod:"cod"|"razorpay", paymentStatus, cancelReason, returnRequest|null, createdAt, updatedAt }`. Items and address are **snapshots** (editing the product or address later does not rewrite history).

| Method | Path                                         | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/orders`                                    | Bearer + **`Idempotency-Key`** header (8-100 url-safe chars; generate ONE `crypto.randomUUID()` per checkout attempt). Body `{ addressId, paymentMethod: "cod"\|"razorpay", deliveryMethod?: "standard"\|"express", deliverySlot?: "YYYY-MM-DD\|9-12", expectedTotal? }`. `201` = order. COD -> `placed`; razorpay -> `pending_payment` (stock reserved; B6 moves it on). Replay with the same key -> `200` + `Idempotent-Replayed: true` and the first order; same key with a different body -> `422 IDEMPOTENCY_KEY_REUSED`. |
| GET    | `/orders?page&limit&status&search`           | Bearer. Own orders, newest first; `search` matches the order number.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| GET    | `/orders/:id`                                | Bearer. Another user's id is `404`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| POST   | `/orders/:id/cancel` `{reason?}`             | Bearer. Only `pending_payment`/`placed`; `409 INVALID_TRANSITION` otherwise (also for a second cancel).                                                                                                                                                                                                                                                                                                                                                                                                                        |
| POST   | `/orders/:id/return` `{reason, note?}`       | Bearer. `reason` in `DAMAGED, WRONG_ITEM, NOT_AS_DESCRIBED, NO_LONGER_NEEDED, OTHER`. Delivered orders within 7 days of delivery (`409 RETURN_WINDOW_CLOSED`). Status becomes `return_requested`.                                                                                                                                                                                                                                                                                                                              |
| GET    | `/orders/:id/invoice`                        | Bearer. `application/pdf` attachment (`409 INVOICE_NOT_AVAILABLE` for `pending_payment`/`cancelled`). Needs the Authorization header, so fetch it as a blob.                                                                                                                                                                                                                                                                                                                                                                   |
| GET    | `/admin/orders`                              | Admin. All orders, same filters.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| POST   | `/admin/orders/:id/status` `{status, note?}` | Admin. Moves the order along the state machine; the dev stand-in for the warehouse/courier until B9 adds tracking events.                                                                                                                                                                                                                                                                                                                                                                                                      |

**State machine** (anything else is `409 INVALID_TRANSITION` with `details.allowed`): `pending_payment -> placed | cancelled`, `placed -> packed | cancelled`, `packed -> shipped`, `shipped -> out_for_delivery | delivered`, `out_for_delivery -> delivered`, `delivered -> return_requested`, `return_requested -> returned | delivered (rejected)`, `returned -> refunded`. Each change is applied with a status guard (`findOneAndUpdate({_id, status: from})`), so two simultaneous changes cannot both win.

**Placing an order is one transaction**: re-price the cart (catalog + live deals + coupon, the same function as `GET /cart`), reserve stock with one conditional decrement per product (`stock >= qty`, so parallel orders can never oversell), claim deal units, redeem the coupon, create the order, empty the cart (saved-for-later lines stay). Failures roll everything back:

- `409 INSUFFICIENT_STOCK` `details.items: [{productId, name, requested, availableQty}]` (all bad lines at once)
- `409 PRICE_CHANGED` `{expectedTotal, actualTotal}` when `expectedTotal` is sent and differs, or when a deal sold out/ended in between
- `422 COUPON_INVALID` (the coupon stopped applying), `422 CART_EMPTY`, `422 PINCODE_UNSERVICEABLE`, `422 COD_NOT_AVAILABLE` (remote pincodes, or total above Rs 50,000)
- Pricing: shipping Rs 40 (free strictly above Rs 499 after discount; express is a flat Rs 99), tax 18% exclusive.
- Cancel / staff-cancel give back stock, the deal claim and the coupon use; `returned` restocks the goods. `return_requested -> returned -> refunded` is driven by `/admin/orders/:id/status` (refund money movement arrives with B6).
- Order email: COD orders send a confirmation to Mailpit (http://localhost:8025) after commit; online orders will after payment (B6).
- Seed: the dev customer has 4 historical orders (2 delivered, 1 shipped, 1 cancelled) numbered `SS-SEED-00000N`.
- Not built here: payment records/Razorpay (B6), tracking events and notifications (B9), expiry of unpaid `pending_payment` orders (B12 job), seller view of orders (B11).

New endpoints are appended here as each backend phase lands (see `BACKEND-ROADMAP.md`).
