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

### Catalog write API and admin users (B1 admin side, B11 part)

Audience: the admin portal (`/admin` app). All of it needs a Bearer token; every successful write is audited (B12). A wrong role is `403 FORBIDDEN`, no token `401`.

**Products.** One handler set, mounted twice:

| Mount              | Who           | Scope                                              |
| ------------------ | ------------- | -------------------------------------------------- |
| `/admin/products`  | admin         | every product, any status                          |
| `/seller/products` | seller, admin | ONLY the caller's own products (`seller` = caller) |

A product outside your scope is **404** (not 403) on read, edit, archive; bulk silently skips ids that are not yours (`matched < requested`). Sellers cannot set `isFeatured` or `sellerId`.

- `GET /…/products?search&status&category(id, subtree)&brand&seller(admin)&lowStock&sort(createdAt|updatedAt|name|price|stock|soldCount)&order&page&limit(<=100)` -> `Product[]` (no description/specs/variants) + page meta. `search` is a partial, case-insensitive match on name, sku and brand.
- `GET /…/products/export.csv` same filters (no paging, max 5000 rows). Cells starting with `= + - @` are prefixed with `'`.
- `GET /…/products/:id` -> full product (`category` and `seller` populated).
- `POST /…/products` -> 201. Body: `name, brand, categoryId, price, mrp, sku` required; optional `description, highlights[], tags[], stock, images[{url,alt}], specs[{key,value}], variants[{sku,color?,size?,price,stock}], status (default draft), slug, isFeatured*, sellerId*` (*admin). **Prices are integer rupees; `price <= mrp`.** With variants, `stock` is the sum of variant stock (and sending `stock` on a PATCH is 422).
- `PATCH /…/products/:id` partial (only the keys you send change; arrays are replaced whole). A price drop queues the same wishlist alert job as `PATCH /admin/products/:id/price`.
- `DELETE /…/products/:id` -> archives (`status: "archived"`), returns the product.
- `POST /…/products/bulk` `{ ids[<=100], status }` -> `{ requested, matched, modified }`.

Errors: `422 VALIDATION_ERROR` with `details[].path` in dot form (`variants.1.sku`, `specs.0.value`, `categoryId`, `price`); duplicate SKU/slug is `409 SKU_TAKEN | SLUG_TAKEN` and also carries `details[0].path` so a form can place it. Images are plain URLs: use `POST /uploads/images` first and send the returned `url`.

**Categories** (admin): `GET /admin/categories` (flat, inactive included, `productCount` = direct products), `POST` `{name, parentId?, image?, sortOrder?, isActive?, slug?}`, `PATCH /:id` (same keys; `parentId` moves it: descendants' `ancestors` and products' `categoryPath` are rewritten; moving under itself or a descendant is `422` path `parentId`), `PUT /admin/categories/reorder` `{ parentId|null, ids[] }` (must list ALL children of that parent; sortOrder = index), `DELETE /:id` (204; `409 CATEGORY_NOT_EMPTY` while it has sub-categories or products). Public tree/brand caches are invalidated at once.

**Brands** (admin): `GET /admin/brands?search` -> `[{ _id, name, slug, logo, productCount }]` (brands already used by products are backfilled), `POST {name, logo?}` (`409 BRAND_EXISTS`, case-insensitive), `PATCH /:id` (a rename rewrites `Product.brand`), `DELETE /:id` (`409 BRAND_IN_USE`). Creating/editing a product with a new brand name creates its Brand row. The public `GET /brands` is unchanged (derived from active products).

**Users** (admin): `GET /admin/users?search&role&isActive&sort(createdAt|name|email|lastLoginAt)&order&page&limit` -> `{ id, name, email, role, phone, emailVerified, isActive, providers, lastLoginAt, createdAt }[]` + page meta; `GET /:id`; `PATCH /:id/role` `{role}`; `PATCH /:id/status` `{isActive}`. Both writes refuse your own account (`409 SELF_MODIFICATION`) and revoke the target's refresh tokens (an already-issued access token lives until `JWT_ACCESS_EXPIRES_IN`; deactivated users cannot log in or refresh).

Seed additions: `seller2@shopsphere.dev` owns every 5th product; every 8th product has S/M/L variants; a `Brand` row per brand.

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
- Reviews, Q&A and moderation: see "Reviews, ratings and Q&A (B7)" below. They accept ONLY URLs of the caller's own uploads (`/uploads/<userId>-<uuid>.<ext>`); a Cloudinary adapter would need `isOwnUpload` (`modules/uploads/ownership.ts`) to learn its URL shape.

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
| GET    | `/coupons/offers`                                      | Public. Live coupons `{ code, description, type, value, maxDiscount, minOrder, expiresAt }` without a cart check (the product page's Offers panel; there are no bank offers in this API).                                                                                                                                                                                                                                           |
| GET    | `/deals?status=active\|upcoming&category=<slug>&limit` | Public. `data[]` = `{ id, dealPrice, startsAt, endsAt, stockLimit, claimed, remaining, badge, discountPercent, status, product: {id,name,slug,brand,imageUrl,price,mrp,stock,category,ratingAvg,ratingCount} }`, `meta.now` = server clock. Poll it for the "claimed" bar.                                                                                                                                                          |
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
- Cancel / staff-cancel give back stock, the deal claim and the coupon use; `returned` restocks the goods. `return_requested -> returned -> refunded` is driven by `/admin/orders/:id/status` or the returns queue below; online refunds move money through the B6 gateway.
- Order email: COD orders send a confirmation to Mailpit (http://localhost:8025) after commit; online orders will after payment (B6).
- Seed: the dev customer has 4 historical orders (2 delivered, 1 shipped, 1 cancelled) numbered `SS-SEED-00000N`.
- Not built here: tracking events and notifications (B9), expiry of unpaid `pending_payment` orders (done in B12), seller view of orders (B11).

### Payments (B6)

Online payment follows Razorpay's Standard Checkout flow. **The browser never decides that a payment succeeded**: the server verifies a signature, and the webhook is the source of truth.

```
Browser                    Backend                         Razorpay (or mock)
  | POST /orders (razorpay)  |                                  |
  |------------------------->| order = pending_payment, stock reserved
  | POST /payments/create-order {orderId}                       |
  |------------------------->|-- create order (amount in paise) ->|
  |<-- {keyId, providerOrderId, amount, prefill} --|            |
  | checkout.js modal (order_id) ------------------------------>|
  |<-- handler {razorpay_payment_id, _order_id, _signature} ----|
  | POST /payments/verify    |  HMAC-SHA256(order_id|payment_id, KEY_SECRET) == signature ?
  |------------------------->|  yes: pending_payment -> placed, payment = paid
  |  poll GET /orders/:id until status != pending_payment       |
  |                          |<-- webhook payment.captured -----|  (final truth; idempotent)
```

| Method | Path                                                                   | Notes                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/payments/config`                                                     | Public. `{ configured, provider: "razorpay"\|"mock"\|null, keyId, mock }`. `keyId` is the PUBLIC key id only.                                                                                                                                                                                                                                                                                                     |
| POST   | `/payments/create-order` `{orderId}`                                   | Bearer. Only for the caller's own `pending_payment` online order. Returns `{ paymentId, orderId, orderNumber, provider, mock, keyId, providerOrderId, amount (PAISE), currency, prefill:{name,email,contact} }`. **Idempotent**: retries (closed modal, failed card) get the SAME provider order. `409 NOT_ONLINE_PAYMENT`, `409 ORDER_NOT_PAYABLE`, `503 PAYMENTS_NOT_CONFIGURED`.                               |
| POST   | `/payments/verify`                                                     | Bearer. Body = `{ orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }` (Razorpay's own names: forward the handler payload as-is). `200` = order (now `placed`/`paymentStatus: "paid"`). `400 SIGNATURE_MISMATCH` (order stays pending), `400 ORDER_MISMATCH`.                                                                                                                                   |
| POST   | `/payments/webhook`                                                    | Public, called by the provider. Authenticated by `x-razorpay-signature` = HMAC-SHA256 of the **raw body** with `RAZORPAY_WEBHOOK_SECRET` (`400 INVALID_SIGNATURE`). Handles `payment.captured`/`order.paid` (-> paid, the amount must equal the order total), `payment.failed`, `refund.processed`/`refund.failed`. Always `200 { duplicate }` for a valid signature; replays (`x-razorpay-event-id`) are no-ops. |
| GET    | `/payments?page&limit&status&orderId`                                  | Bearer. My payments: `{ id, orderId, orderNumber, provider, amount, currency, status: created\|failed\|paid\|cancelled, method, attempts, failureReason, paidAt, refundedAmount, refunds:[{amount,status:pending\|processed\|failed,reason,createdAt,processedAt}], createdAt }`.                                                                                                                                 |
| POST   | `/payments/mock/pay` `{orderId, outcome, method?}`                     | Bearer, mock gateway only (non-production). `outcome`: `success` (returns the signed `handler` payload and delivers a webhook), `success_no_callback` (the tab closed after paying: only the webhook arrives), `failure` (card declined, `payment.failed` webhook).                                                                                                                                               |
| POST   | `/payments/dev/webhook` `{orderId, event, paymentId?}`                 | Bearer, non-production. Fires a correctly signed `payment.captured`/`payment.failed` at the real webhook handler. This is how you test webhooks locally with REAL test keys (Razorpay cannot reach `localhost`; or use a tunnel such as ngrok and register `https://<tunnel>/api/v1/payments/webhook`).                                                                                                           |
| GET    | `/admin/payments`, POST `/admin/payments/:id/refund {amount?, reason}` | Admin. Refund part or all of what is left (`409 REFUND_EXCEEDS_PAYMENT {refundable}`, `409 NOT_PAID`).                                                                                                                                                                                                                                                                                                            |

Rules worth knowing:

- **Order states.** Online orders are `pending_payment` until paid; failures and closed modals leave them `pending_payment` (with `paymentStatus: "failed"` after a failed attempt) and retryable, so the UI shows "Retry payment" using the same order. Unpaid orders are auto-cancelled after `ORDER_EXPIRY_MINUTES` (default 30) by the B12 job `orders.expire-unpaid`: stock, deal claim and coupon use are released and the shopper is told the order was cancelled.
- **Two roads to "paid", one winner.** `verify` and the webhook call the same guarded update, so in any order and any number of times the order is placed once, one confirmation email goes out, and `statusHistory` gets one `placed` entry. A failure event can never un-pay a paid payment.
- **Late payment on a cancelled order** (shopper cancelled, but still paid in the open modal) is refunded automatically.
- **Refunds** run through the gateway: cancelling a paid order refunds it in full; the `returned -> refunded` step refunds the returned items' share (see Returns). The mock settles instantly; real Razorpay answers `pending` and the `refund.processed` webhook finishes it. `paymentStatus` walks `paid -> refund_pending -> partially_refunded|refunded`. COD has no gateway refund.
- **Amounts:** whole rupees everywhere except the provider boundary (`amount` from `create-order` is paise, as Razorpay's `options.amount` expects).
- **Mock gateway.** With no `RAZORPAY_KEY_ID`/`SECRET` (and outside production) the backend uses `MockGateway`: same flow, same signature scheme, `provider: "mock"`, key id `rzp_test_mockgateway`. The frontend renders its own fake "modal" for it. Setting real keys switches to Razorpay with no frontend change. `PAYMENT_MOCK=true|false` forces it; production never mocks (no keys = `503 PAYMENTS_NOT_CONFIGURED`).

**What you must supply for real Razorpay (test mode, no KYC):**

1. Razorpay Dashboard, switch to **Test Mode**, Account & Settings > API Keys > Generate Test Key. Put `RAZORPAY_KEY_ID=rzp_test_...` and `RAZORPAY_KEY_SECRET=...` in `backend/.env` only. The secret never goes in the frontend or git; the frontend receives just the key id from `/payments/config` and `create-order`.
2. Webhooks need a public URL. Run a tunnel (e.g. `ngrok http 4000`), then Dashboard > Webhooks > Add: URL `https://<tunnel>/api/v1/payments/webhook`, a secret of your choice, events `payment.captured`, `payment.failed`, `refund.processed`. Put that secret in `RAZORPAY_WEBHOOK_SECRET`. Without a tunnel the `verify` call still completes payments, and `POST /payments/dev/webhook` (needs `RAZORPAY_WEBHOOK_SECRET` set) simulates deliveries.
3. Restart the backend. Test cards/UPI: https://razorpay.com/docs/payments/payments/test-card-details/ (e.g. success card 4111 1111 1111 1111, any future expiry and CVV; the dashboard lists a failure card/UPI `failure@razorpay`).
4. The real adapter calls `https://api.razorpay.com/v1` with `fetch`. It is covered by a stubbed-fetch unit test but was NOT run against live Razorpay in this build (no keys available).

### Reviews, ratings and Q&A (B7)

Product ids in these paths are the Mongo `_id` (not the slug). Money is irrelevant here; counts are integers.

| Method     | Path                                                                               | Notes                                                                                                                                                                                                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET        | `/products/:id/reviews/summary`                                                    | Public. `{ average (1 decimal), count, histogram: {"1".."5"}, withPhotos }` from PUBLISHED reviews. Drives the rating bars.                                                                                                                                                                           |
| GET        | `/products/:id/reviews?page&limit&sort&rating&photos`                              | Public (send Bearer to get `myVote`/`isMine`). `sort`: `helpful` (default), `newest`, `highest`, `lowest`; `rating=1..5`; `photos=true`. Review = `{ id, productId, author ("Casey C."), rating, title, body, photos[], verifiedPurchase, helpfulCount, status, edited, isMine, myVote, createdAt }`. |
| GET        | `/products/:id/reviews/eligibility`                                                | Bearer. `{ canReview, reason: null\|"ALREADY_REVIEWED"\|"OWN_PRODUCT", verifiedPurchase, review }` (`review` = my own, if any). Use it to show the "Write a review" button or the reason it is unavailable.                                                                                           |
| POST       | `/products/:id/reviews` `{rating 1-5, title?, body 10-2000, photos?[<=5]}`         | Bearer. `201`. `409 ALREADY_REVIEWED` (database-enforced, one per user per product), `403 OWN_PRODUCT`. **`verifiedPurchase` is computed** (a delivered order contains the product). `photos` must be your own uploads from `POST /uploads/images` (else `422`, `details[].path = "photos.N"`).       |
| PATCH      | `/reviews/:id`                                                                     | Bearer, owner only (`404` for others). Any of `rating,title,body,photos`; sets `edited: true`.                                                                                                                                                                                                        |
| DELETE     | `/reviews/:id`                                                                     | Bearer, owner (or admin). `204`.                                                                                                                                                                                                                                                                      |
| PUT/DELETE | `/reviews/:id/helpful`                                                             | Bearer. Idempotent set/unset (double clicks and parallel tabs cannot double count). `{ helpfulCount, myVote }`. `403 OWN_CONTENT`.                                                                                                                                                                    |
| POST       | `/reviews/:id/report` `{reason}`                                                   | Bearer. One report per user (`alreadyReported`).                                                                                                                                                                                                                                                      |
| GET        | `/products/:id/questions?page&limit&sort`                                          | Public. `sort` `helpful`\|`newest`. Each question has `answerCount` and its top 3 `answers` (seller/staff badge first, then upvotes).                                                                                                                                                                 |
| POST       | `/products/:id/questions` `{text 10-300}`                                          | Bearer.                                                                                                                                                                                                                                                                                               |
| GET/POST   | `/questions/:id/answers`                                                           | GET paged (public); POST `{text}` (Bearer). Answer = `{ id, author, text, badge: "seller"\|"staff"\|null, verifiedBuyer, upvotes, myVote, isMine }`. `seller` = the product's own seller, `staff` = admin.                                                                                            |
| PUT/DELETE | `/questions/:id/upvote`, `/answers/:id/upvote`                                     | Bearer, idempotent, `403 OWN_CONTENT`.                                                                                                                                                                                                                                                                |
| DELETE     | `/questions/:id`, `/answers/:id`                                                   | Bearer, owner (or admin).                                                                                                                                                                                                                                                                             |
| GET        | `/admin/reviews?status&productId&reported=true`                                    | Admin moderation queue (adds `product`, `reportCount`, `moderationNote`).                                                                                                                                                                                                                             |
| POST       | `/admin/reviews/:id/moderate` `{status: published\|hidden, note?}`                 | Admin. Hidden reviews disappear from the product page and its rating.                                                                                                                                                                                                                                 |
| GET/POST   | `/admin/questions`, `/admin/questions/:id/moderate`, `/admin/answers/:id/moderate` | Admin.                                                                                                                                                                                                                                                                                                |

Rules worth knowing:

- **Aggregates are real.** `Product.ratingAvg/ratingCount` are recomputed from published reviews after every create/edit/delete/moderation, so the product card, the PDP header and the histogram agree. The seed replaces the old random ratings with ones computed from seeded reviews (about 85% of products have 1-14 reviews).
- **Review text is plain text.** The API stores and returns it verbatim (`<script>` stays `<script>`); the UI must render it as text (React does by default) and never with `dangerouslySetInnerHTML`.
- Reviewer names are masked (`First L.`) because reviews are public.
- Seed: dev customer reviewed their first delivered product and has voted helpful on a few reviews; their second delivered product is unreviewed (for the "write a review" demo). ~40 popular products carry questions and answers (some by the seller, badge `seller`).

### Returns (B9, returns slice)

`POST /orders/:id/return` is richer now: `{ reason, note?, items?: [{productId, qty}], photos?: [url] (max 4, your own uploads), pickupAddressId? }`. Omitting `items` returns everything. Quantities above what was bought are `422` (`details[].path = "items.N.qty"`), as are photos that are not the caller's own uploads (`photos.N`). The order becomes `return_requested` and carries:

```jsonc
"returnRequest": { "status": "requested|approved|rejected|refunded", "reason", "note", "requestedAt", "resolvedAt",
  "refundAmount": 1180,            // whole rupees: the returned items' share of (subtotal - discount + tax); shipping is not refunded
  "items": [{ "productId", "title", "qty", "unitPrice" }], "photos": [], "pickupAddress": { ... },
  "history": [{ "status", "at", "note" }] }  // the return timeline
```

Orders also expose `deliveredAt` and `returnableUntil` (set while `delivered`, null once the 7-day window has passed or the status moved on). A rejected return puts the order back to `delivered` WITHOUT restarting the window.

| Method | Path                                                               | Notes                                                                                                                                                                                                                                                                                       |
| ------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/admin/returns?status&page&limit`                                 | Admin queue of orders with a return request, newest request first.                                                                                                                                                                                                                          |
| POST   | `/admin/returns/:id/decision` `{decision: approve\|reject, note?}` | approve: `return_requested -> returned`, only the returned units go back to stock. reject: back to `delivered`.                                                                                                                                                                             |
| POST   | `/admin/returns/:id/refund` `{note?}`                              | `returned -> refunded`. Razorpay orders: a gateway refund for `refundAmount` (instant on the mock, `refund_pending` until the webhook on real Razorpay; the order's `paymentStatus` then becomes `partially_refunded` or `refunded`). COD: marked refunded (money is returned out of band). |

Return events notify and push live (see "Notifications and realtime (B9)" below). The seed has no pending return: the dev customer's recent delivered order (3 days ago) is inside the window, the older one (20 days) is outside it.

### Search suggestions, recently viewed, recommendations, compare (B8)

Product rows in every rail below have the same shape as `GET /products` list rows (no description/specs/highlights) plus `deal` (the live deal or null). Inactive/archived products never appear.

| Method | Path                                                        | Notes                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/search/suggest?q=&limit=`                                 | Public. `q` 2-60 chars (`422` otherwise), `limit` 1-10 (products, default 6). `{ query, products[{id,slug,name,brand,price,image,category}], categories[{id,name,slug}], brands[{name,count}], correction }`. Prefix match on word starts, most popular first. `correction` ("did you mean") is non-null ONLY when nothing matched and the corrected term has results. `Cache-Control: public, max-age=30`. |
| GET    | `/me/recently-viewed?limit=`                                | Bearer. Newest first, max 30 are kept per user.                                                                                                                                                                                                                                                                                                                                                             |
| POST   | `/me/recently-viewed` `{ items: [{productId, viewedAt?}] }` | Bearer. `202 { recorded }`. One item for a PDP view; up to 30 for the post-login merge of the guest list. Upsert per (user, product); `viewedAt` only moves forward and is clamped to "now"; unknown/inactive ids are ignored.                                                                                                                                                                              |
| DELETE | `/me/recently-viewed`                                       | Bearer. `204`.                                                                                                                                                                                                                                                                                                                                                                                              |
| GET    | `/products/:idOrSlug/similar?limit=`                        | Public. Same category neighbourhood, ranked by category match, brand, price closeness, rating.                                                                                                                                                                                                                                                                                                              |
| GET    | `/products/:idOrSlug/also-bought?limit=`                    | Public. Products in the same non-cancelled orders, most frequent first. `meta.source`: `orders` (all real), `mixed`, `similar` (no co-purchases yet, topped up with similar products). Label the rail accordingly.                                                                                                                                                                                          |
| GET    | `/recommendations/trending?category=&limit=`                | Public. In-stock best sellers (optionally inside a category subtree).                                                                                                                                                                                                                                                                                                                                       |
| GET    | `/recommendations/for-you?limit=&seed=id1,id2`              | Public; send Bearer to personalise from purchases (weight 3), wishlist (2) and recently viewed (1). Guests may pass their local recently-viewed ids as `seed`. `meta = { personalised, basedOn: [category names] }`. No signal: trending with `personalised: false`. Already bought/viewed products are excluded.                                                                                           |
| GET    | `/products/compare?ids=a,b,c`                               | Public. 2-4 ids (`422` otherwise), `404` if one is missing/inactive. `{ products[...], specs[{ key, values[], differs }] }`; `values[i]` belongs to `products[i]` (`null` = the product has no such spec).                                                                                                                                                                                                  |

Seed: ~120 historical delivered orders by the reviewer accounts (popular products bought with siblings from their category) feed "also bought"; the dev customer has 6 recently viewed products.

### Notifications and realtime (B9, completed)

In-app + email notifications, Socket.io push, and order tracking events. Every order status change (placement, payment confirmed, packed, shipped, out for delivery, delivered, cancelled, return requested/approved/declined, refund started) goes through ONE function, `onOrderStatusChanged` (`modules/orders/order.events.ts`), after the change is committed. It (1) emits `order:status` and (2) stores a notification, pushes it and, for the important steps, emails it, honouring the user's preferences. A refund the gateway has finished emits `order:payment` and a "refund processed" notification. These are fire-and-forget: a notification failure never fails the order change.

| Method    | Path                                                     | Notes                                                                                                                                                                                                            |
| --------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET       | `/notifications?page&limit&unread&category`              | Bearer. Newest first. `meta` = page meta + `unreadCount`. Item = `{ id, category (orders\|offers\|account), type ("order.shipped", "return.approved", ...), title, body, link, data, read, readAt, createdAt }`. |
| GET       | `/notifications/unread-count`                            | Bearer. `{ count }` (the bell badge).                                                                                                                                                                            |
| POST      | `/notifications/:id/read`                                | Bearer. Idempotent (first `readAt` kept). `{ notification, unreadCount }`. Someone else's id is `404`.                                                                                                           |
| POST      | `/notifications/read-all`                                | Bearer. `{ updated, unreadCount: 0 }`.                                                                                                                                                                           |
| DELETE    | `/notifications/:id`                                     | Bearer. `204`.                                                                                                                                                                                                   |
| GET/PATCH | `/notifications/preferences`                             | Bearer. `{ orders, offers, account }`, each `{ inApp, email }`. Defaults: orders on/on, offers on/off, account on/on. PATCH is partial (`{ "orders": { "email": false } }`).                                     |
| POST      | `/admin/notifications/broadcast` `{title, body?, link?}` | Admin. An `offers` notification to every customer who allows in-app offers. `link` must be a same-site path. `{ sent }`.                                                                                         |

Notifications expire after 90 days (TTL index). Templates live in code (`notification.templates.ts`); the "templates" admin screen is not built.

**Socket.io** (same port as the API, path `/socket.io`):

- Connect with `io(API_ORIGIN, { auth: (cb) => cb({ token: currentAccessToken }) })`. The access token is verified in the handshake. Refusal arrives as `connect_error` with `err.data.code` = `UNAUTHORIZED` (no token), `INVALID_TOKEN`, or `TOKEN_EXPIRED` (refresh the access token, then reconnect).
- A token is only checked at the handshake, so the server cuts a socket off when ITS token expires: it emits `auth:expired` and disconnects (`io server disconnect`, which socket.io does NOT auto-reconnect: the client must refresh and `connect()` again).
- Each user's sockets join the room `user:<id>`; the server only emits there, so a client never sees another user's events.

| Event (server to client) | Payload                                                                                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ready`                  | `{ userId, serverTime }` right after the handshake succeeds.                                                                                                                                  |
| `notification:new`       | `{ notification, unreadCount }` (same item shape as the REST list; the count is fresh, so the badge needs no second request).                                                                 |
| `order:status`           | `{ orderId, orderNumber, status, from, paymentStatus, returnStatus, entry: { status, at, note } }`: `entry` is the new `statusHistory` line, append it; `status` replaces the order's status. |
| `order:payment`          | `{ orderId, paymentStatus }` (refund settled).                                                                                                                                                |
| `auth:expired`           | The access token behind this socket expired; reconnect with a fresh one.                                                                                                                      |

Events are NOT replayed. After a reconnect the client must refetch what it shows (`/notifications/unread-count`, the open order); that is how a missed event stays harmless.
Seed: the dev customer has notifications generated from their seeded orders with the live templates (the newest 4 are unread) plus an offers notification.

### Hardening and ops (B12)

Everything here runs with NO Redis; `REDIS_URL` only changes where state lives.

| Concern                  | Without `REDIS_URL`                                                                              | With `REDIS_URL` (`docker compose --profile cache up -d`)                          |
| ------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Cache (`utils/cache.ts`) | in-process Map with TTL (max 500 entries)                                                        | Redis keys with `EX`                                                               |
| Rate-limit counters      | express-rate-limit memory store (per process, reset on restart)                                  | `RedisRateLimitStore` (atomic INCR+PEXPIRE, shared by all instances)               |
| Jobs (`jobs/queue.ts`)   | in-process runner: same handlers, 3 attempts, exponential backoff; **jobs die with the process** | BullMQ queue `shopsphere`: durable, retried, repeating jobs as upserted schedulers |

Env: `REDIS_URL`, `CACHE_ENABLED` (true), `CACHE_TTL_SECONDS` (30), `JOBS_ENABLED` (true; false = no workers/schedulers on this instance, producing still works), `ORDER_EXPIRY_MINUTES` (30), `ORDER_EXPIRY_SWEEP_SECONDS` (60). All in `.env.example`.

**HTTP caching.** Every `GET` carries a weak `ETag` (Express computes it from the body): send `If-None-Match` and get `304` with no body. `Cache-Control` policy:

- default for `/api/v1`: GET `private, no-cache` (store, but revalidate first: safe for cart/orders/me); everything else `no-store`; every error response is forced to `no-store`.
- public catalog: `GET /categories`, `/categories/:slug`, `/brands`: `public, max-age=300, stale-while-revalidate=3600`; `GET /products`, `/products/:idOrSlug`: `public, max-age=10, stale-while-revalidate=60`; `GET /banners`: `max-age=60`; `GET /config/public`: `max-age=3600, swr=86400`.
- `GET /time` stays `no-store`. Never add `publicCache` to a route that reads `Authorization` or `x-cart-token`.

**Server cache.** Category tree, brand list (5 min) and product facet counts (`CACHE_TTL_SECONDS`) are cached. Invalidation is by version: any write to a `Product` (model hooks) bumps the `catalog` version, so entries become unreachable at once. The hook runs inside order transactions before commit, so a reader can very briefly cache pre-commit data; the TTL bounds that. The seed script runs out of process and does not bump the version (restart the API or wait out the TTL after reseeding).

**Security headers.** API responses: `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` (camera/microphone/geolocation/payment off), HSTS in production, `Cross-Origin-Resource-Policy: cross-origin` (the SPA shows API-hosted images). `/api/docs` keeps helmet's default CSP so Swagger UI works.

**Rate limits.** `apiLimiter` 300/min/IP on all of `/api/v1`; `authLimiter` 30 per 15 min on credential endpoints; `uploadLimiter` 30/min **per account**; `metricsLimiter` 120/min on the vitals beacon; `staffWriteLimiter` 120 writes/min **per account** on `/admin/*` and `/seller/*` (reads are exempt). 429 body: `{ error: { code: "RATE_LIMITED" | "AUTH_RATE_LIMITED" | "UPLOAD_RATE_LIMITED" } }` plus draft-8 `RateLimit` headers.

**Audit log** (`AuditLog`, 1 year TTL). Every successful (status < 400) non-GET request under `/admin` or `/seller` writes one row: actor, role, action (`PATCH /admin/products/:id/price`), concrete path, the ids found in the path, status, ip, request id. Bodies are never stored. `GET /admin/audit-logs?page&limit&actor&target&action&from&to` (admin; `action` is a prefix match) returns `{ id, at, actor{id,name,email}|null, role, action, path, targets, status, ip, requestId }[]` newest first.

**Jobs.**

| Job                    | Triggered by                                               | Does                                                                                                |
| ---------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `email.send`           | `sendEmail()` (auth mails, order/notification mails)       | sends through SMTP; throws on failure so the queue retries (3 attempts, exponential backoff)        |
| `price-drop.alert`     | `PATCH /admin/products/:id/price` when the price goes DOWN | notifies every wishlister (in-app; email only if they enabled offers emails) with type `price.drop` |
| `orders.expire-unpaid` | repeating, every `ORDER_EXPIRY_SWEEP_SECONDS`              | cancels `pending_payment` orders older than `ORDER_EXPIRY_MINUTES` that are not paid (200 per run)  |

**New endpoints.**

- `PATCH /admin/products/:id/price` `{ price }` (admin, whole rupees, must be <= mrp): `{ id, name, from, to, wishlistAlertQueued }`. 400 above the list price, 404, 403, 422.
- `GET /config/public`: `{ baseCurrency: "INR", chargedCurrency: "INR", currencies: { INR: { rate, symbol }, USD, EUR, GBP, AED }, asOf, locales }`. Rates are for DISPLAY only; the backend, the order and the payment are always INR.
- `POST /metrics/vitals` (public, `204`): `{ name: LCP|INP|CLS|FCP|TTFB, value, rating?, path (no query string), connection?, nav?, ua?: mobile|desktop }`. Stored 30 days. `GET /admin/metrics/vitals?days=7` returns `{ name, path, samples, p75 }[]`.
- Seed: the dev customer now also has 2,000 older read notifications (one per hour, every 7th with a long body) for the virtualised list; the unread badge is still 4.

Not built (out of B12 scope here): idempotency keys beyond orders, soft-delete, cursor pagination, Sentry, load test, deploy config (Stage 14).

## Production configuration (Stage 14)

No new endpoints. Configuration only (full table: `frontend/docs/environments.md`, steps: `DEPLOY.md`):

- `COOKIE_DOMAIN` (optional). Empty = host-only refresh cookie. It is applied on set AND clear, otherwise logout would leave the cookie behind.
- `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` for a real e-mail provider (Mailpit needs none).
- **Boot guard** (`src/config/prodChecks.ts`): with `NODE_ENV=production` the process exits with a list of problems unless `COOKIE_SECURE=true`, `JWT_ACCESS_SECRET` is not a development placeholder, `CORS_ORIGINS` has no wildcard and only `https://` origins (a `http://localhost` origin is tolerated for a staging API used from a local frontend), and `CLIENT_URL` is `https://`.
- **Seed guard** (`src/seed/guard.ts`): `npm run seed` is idempotent. Against a non-local `MONGODB_URI`, `--reset` (drops the database) additionally requires `--i-know-this-wipes-the-database`, and the seeded accounts get `SEED_PASSWORD` (12+ characters) instead of the public development password.
- Every response carries `x-request-id` (exposed to browsers by CORS); the frontend puts it on error reports (tag `request_id`) and on the error page ("Reference"), and the same id is in the pino log line of that request (`req.id`).
- `GET /api/v1/health` is the liveness check for hosts and uptime monitors (`"db":"up"` when MongoDB answers).

### Analytics (B11, admin dashboard + seller view + "My spending")

All GETs, Bearer. `/admin/analytics/*` is admin only (platform-wide); `/seller/analytics/*` is seller or admin and is **pinned to the caller's own products and order lines** (a seller's "revenue" is the sum of their lines, never the order total, shipping or another seller's lines). The seller set has no `/funnel`.

Range on every endpoint except `low-stock`: `?days=7|30|90|...` (a preset ending now, default 30) **or** `?from=YYYY-MM-DD&to=YYYY-MM-DD` (inclusive, India calendar days; `to` defaults to today). `from > to` is `422`. Days are IST (UTC+5:30), money is whole rupees. "Sold" orders = placed, packed, shipped, out_for_delivery, delivered, return_requested (not unpaid, cancelled, returned, refunded).

- `GET /overview` -> `{ range, revenue, orders, averageOrderValue, unitsSold, newCustomers (null for sellers) }` each `{ value, previous, deltaPct }` (previous = the equal-length period right before; `deltaPct` is `null` when previous is 0 and value is not), plus `attention: { toShip, returnsOpen, lowStock, lowStockThreshold }`.
- `GET /revenue` -> `{ range, total, points: [{ date, revenue, orders }] }`, one point per day, zeros filled.
- `GET /orders-by-status` -> `[{ status, count, amount }]` (every status, including cancelled/unpaid).
- `GET /top-products?limit(<=20, default 5)&by=revenue|units` -> `[{ productId, name, slug, sku, image, stock, revenue, units }]`.
- `GET /category-share` -> `[{ categoryId, name, slug, revenue, sharePct }]` rolled up to the **root** category.
- `GET /low-stock?threshold&limit` -> `{ threshold, total, items }` (active products, `stock <= threshold`; default threshold = the `lowStockThreshold` platform setting).
- `GET /funnel` (admin) -> `{ range, steps: [{ key: viewed|cart|checkout|paid, label, count, ofPrevious, ofFirst }] }`. Counts are **distinct signed-in shoppers** (guests are not tracked): recently-viewed rows, non-empty carts touched in range, shoppers with any order, shoppers with a non-cancelled paid-or-COD order. A step can exceed the previous one if data is odd, so rates are `null`-safe percentages, not guarantees.
- `GET /me/spending?months=6` (any signed-in user) -> `{ months, total, orders, points: [{ month: "2026-10", spent, orders }] }`, the account page chart.

### Seller applications, sellers, system and the audit diff (B11)

- `POST /seller-applications` (any signed-in customer) `{ businessName, phone (10-digit IN), gstin?, about? }` -> 201, status `pending`. `409 APPLICATION_PENDING` (one pending at a time, enforced by a partial unique index) or `409 ALREADY_SELLER`. `GET /seller-applications/mine` -> latest application or `null`.
- Admin: `GET /admin/seller-applications?status&page&limit` (pending = oldest first), `POST /admin/seller-applications/:id/decision` `{ decision: approve|reject, note? }` (note **required** for reject). Approve sets `role = seller`, revokes the user's refresh tokens (next login carries the role) and sends an in-app notification + email. A second decision is `409 ALREADY_REVIEWED`. `GET /admin/sellers/:id` -> profile, `products { total, active, draft, archived }`, `sales { revenue, units, orders }`, latest application (`404` for a non-seller).
- `GET /admin/system/health` -> `{ status: ok|degraded, checks: [{ name, status: ok|down|disabled, detail, latencyMs? }], process, cache }`. `GET /admin/system/settings` -> `{ editable: { storeName, supportEmail, lowStockThreshold, announcement }, readOnly: {...} }`; `PATCH` a subset of `editable` (audited with before/after). `lowStockThreshold` feeds the dashboard's low-stock numbers.
- Audit rows now carry `changes: { field: { before, after } } | null` for role/status changes, order status moves, refunds, coupon/deal/banner/product edits, application decisions and settings (never whole bodies). `GET /admin/audit-logs` gained `entity` (`products|categories|brands|users|orders|returns|payments|coupons|deals|banners|reviews|questions|answers|seller-applications|system|notifications`), a filter on the `/admin|seller/<entity>` part of the path.

### Order operations for the admin and seller portals (B11)

- `GET /admin/orders?status&paymentMethod(cod|razorpay)&search&from&to&sort(createdAt|total)&order&page&limit(<=100)` -> orders in the customer shape **plus** `customer { id, name, email, phone }` and `staffNotes`. `search` matches the order number, or the customer's name/email. `from`/`to` are India calendar days. `GET /admin/orders/export.csv` takes the same filters (max 5000 rows). `GET /admin/orders/:id` adds `payment { id, status, amount, refundedAmount, refundable, refunds[] } | null` (`refundable` > 0 only for a captured online payment).
- `POST /admin/orders/:id/status` `{ status, note?, shipment? }`: moving to **shipped** needs `shipment { carrier, trackingId }` (stored, shown to the customer as `order.shipment`); moving to **cancelled** needs a `note` (the reason, `cancelReason`). Both are `422` with `details[].path` (`shipment.carrier`, `note`). Anything the state machine forbids is `409 INVALID_TRANSITION { status, allowed }`. The audit row records `status` before/after.
- `POST /admin/orders/:id/notes` `{ text }` -> 201 with the order detail. Staff notes are internal: the customer endpoints never return them.
- `GET /admin/returns` now carries `customer` too.
- **Refund idempotency.** `POST /admin/payments/:id/refund` accepts `Idempotency-Key` (8-100 url-safe chars; the admin UI sends one UUID per open dialog). The key is stored on the refund entry. A retry with the same key (double click, network retry) returns the first result with `Idempotent-Replayed: true` and writes no second audit row; the same key with a different `amount` is `422 IDEMPOTENCY_KEY_REUSED`; a malformed key is `400 IDEMPOTENCY_KEY_INVALID`. Two simultaneous requests are separated by the existing guarded write (`refunds` array length): one wins, the other is `200` replay or `409 REFUND_IN_PROGRESS`. Over-refunding is `409 REFUND_EXCEEDS_PAYMENT`. Without the header the old behaviour applies.
- **Seller view.** `GET /seller/orders` and `/:id` (seller or admin): orders containing one of the caller's products (unpaid `pending_payment` hidden), reduced to `{ id, orderNumber, status, createdAt, items (own lines only), yourTotal, units, addressSnapshot, delivery, shipment, statusHistory, paymentMethod }`. No pricing/payment totals and no customer identity. An order with no line of yours is `404`. Sellers cannot change order status (admin only).
- **Deals.** Creating or editing an ACTIVE deal whose window overlaps another active deal on the same product is `409 DEAL_OVERLAP` with `details[0].path = "startsAt"` (touching windows are fine). `GET /admin/deals` adds `productInfo { id, name, slug, price, image }`.
- **Q&A moderation.** `GET /admin/questions?status&unanswered` returns each question with `product { name, slug }` and ALL its answers (hidden included) so a moderator can hide or restore them.
- **Realtime.** Admin sockets join a `staff` room (by role, at the handshake): `order:new { orderId, orderNumber, total }` when an order becomes `placed` (COD at checkout, online when paid) and `order:status { orderId, orderNumber, status, from }` on every change.
