# ShopSphere Learning Plan

> Build a production-grade, Amazon/Flipkart-style e-commerce platform by hand, and learn the missing half of React (effects, data fetching, server state, auth, forms, testing, performance, deployment) while doing it.

You already ship good static React UI, you know `useState`, and JS/React fundamentals are solid. This plan does not re-teach what you know. It spends your time on the capabilities you do not yet have, and every one of them is learned inside a real feature of a real product.

- **You write:** `/frontend` (the customer storefront), by hand.
- **Claude builds:** `/backend` (phase by phase, `B0`..`B12`) and `/admin` (TanStack Start dashboard).
- **Duration:** about 14 to 16 weeks part-time (roughly 10 to 12 hours per week). See [Pacing](#9-pacing).

---

## Table of contents

1. [How to use this plan](#1-how-to-use-this-plan)
2. [The product: ShopSphere](#2-the-product-shopsphere)
   - [2.1 Feature catalogue](#21-feature-catalogue)
   - [2.2 Route map](#22-route-map)
   - [2.3 Data model overview](#23-data-model-overview)
   - [2.4 API contract you code against](#24-api-contract-you-code-against)
   - [2.5 Backend milestones (B0..B12)](#25-backend-milestones-b0b12)
   - [2.6 Which pages are built in which stage](#26-which-pages-are-built-in-which-stage)
3. [Frontend architecture and conventions](#3-frontend-architecture-and-conventions)
4. [The 14 stages](#4-the-14-stages)
   - [Stage 0: Setup and project tour](#stage-0-setup-and-project-tour)
   - [Stage 1: JavaScript essentials, applied](#stage-1-javascript-essentials-applied)
   - [Stage 2: TypeScript essentials, applied](#stage-2-typescript-essentials-applied)
   - [Stage 3: React fundamentals refresh](#stage-3-react-fundamentals-refresh)
   - [Stage 4: Hooks and effects](#stage-4-hooks-and-effects)
   - [Stage 5: Routing and project organization](#stage-5-routing-and-project-organization)
   - [Stage 6: API and data integration (by hand)](#stage-6-api-and-data-integration-by-hand)
   - [Stage 7: Forms and validation](#stage-7-forms-and-validation)
   - [Stage 8: State ownership and Context](#stage-8-state-ownership-and-context)
   - [Stage 9: Server state with TanStack Query](#stage-9-server-state-with-tanstack-query)
   - [Stage 10: Authentication end to end](#stage-10-authentication-end-to-end)
   - [Stage 11: Commerce flows](#stage-11-commerce-flows)
   - [Stage 12: Quality: testing, debugging, accessibility](#stage-12-quality-testing-debugging-accessibility)
   - [Stage 13: Performance and polish](#stage-13-performance-and-polish)
   - [Stage 14: Production and deep dives](#stage-14-production-and-deep-dives)
   - [Optional admin track](#optional-admin-track)
5. [Library map](#5-library-map)
6. [Milestone checklist](#6-milestone-checklist)
7. [AI-assisted development prompts per stage](#7-ai-assisted-development-prompts-per-stage)
8. [Self-assessment rubric](#8-self-assessment-rubric)
9. [Pacing](#9-pacing)
10. [Guide resources and master link list](#10-guide-resources-and-master-link-list)

---

## 1. How to use this plan

### 1.1 Mapping to your 8-stage guide

Your guide (`React-Application-Development-Foundational`) has 8 capability stages. This plan has 15 build stages (0 to 14) because each guide stage is applied inside the shop, in order.

| Guide stage | Where it lives in this plan |
| --- | --- |
| 1. JavaScript Essentials | Stage 1 (⚡ skim most, deep on async/reduce/groupBy) |
| 2. TypeScript Essentials | Stage 2 |
| 3. React Fundamentals | Stage 3 (⚡ skim, quick sanity tasks) |
| 4. React Application Development (hooks, effects, routing, organization) | Stage 4, Stage 5 |
| 5. API and Data Integration | Stage 6, Stage 7 |
| 6. State and Server State | Stage 8, Stage 9 |
| (applied, cross-cutting) | Stage 10 (auth), Stage 11 (commerce flows) |
| 7. Quality, Debugging and Performance | Stage 12, Stage 13 |
| 8. Production Awareness and AI-assisted development | Stage 14, plus the AI prompts in every stage |

### 1.2 The rhythm: Learn, Explore, Build, Understand, Improve

Every topic is worked in the same five beats. Keep this rhythm, it is what turns reading into capability.

1. **Learn (20 to 30 min).** Read the *Concept* paragraph, then the primary resource (usually official docs). One resource only. Do not binge tutorials.
2. **Explore (15 to 20 min).** Break it on purpose in a scratch file or the browser console. Change a dependency array, throw an error, throttle the network. Predict, then observe.
3. **Build (the bulk).** Do the **Hands-on task** in the shop. Write it yourself. Look at the acceptance criteria before you start, not after.
4. **Understand.** Explain the result aloud (or in a commit message / short note) without looking: what runs, when, and why. If you cannot, you have not finished.
5. **Improve.** Do the *Stretch* if the topic matters for later stages, or refactor what you just wrote against the [conventions](#34-conventions). Then move on. Not every stretch is mandatory.

### 1.3 Definition of done (applies to every task)

A task is done only when all of these are true:

- [ ] Every acceptance criterion in the task is checked, and you verified it in the browser (not just "it compiles").
- [ ] `npm run typecheck` passes with zero errors. No `any` introduced without a comment explaining why.
- [ ] No console errors or warnings in the browser, including React's key/dependency warnings. Check with React StrictMode on (it is on by default in dev; do not turn it off).
- [ ] Network tab inspected: no duplicate requests you cannot explain, no request waterfalls you did not intend, no failed requests.
- [ ] Loading, error and empty states exist for anything that fetches (from Stage 6 on).
- [ ] Works at 360px and 1280px widths and with keyboard only (Tab, Enter, Escape) for anything interactive.
- [ ] You can explain every line to someone else. If AI wrote part of it, you have read it, run it and can justify it (see [AI rules](#14-ai-rules-from-your-guide)).
- [ ] Committed on its own branch with a clear message (see [Git habit](#15-git-and-pr-habit)).

### 1.4 AI rules (from your guide)

Your guide's rule of thumb: **use AI to accelerate learning and implementation, not to outsource understanding.** Concretely:

- **Ask for explanations before code.** "Explain why this effect runs twice in dev" beats "write my effect".
- **Write first, then ask for review.** Attempt every Hands-on task yourself before prompting. Then paste your code and ask AI to review it (prompt templates in [section 7](#7-ai-assisted-development-prompts-per-stage)).
- **Verify APIs.** AI invents hooks and options. Every library call it suggests gets checked against the official docs link in the topic's Resources.
- **Read before accepting.** If you cannot explain a generated block, do not commit it. Ask "why does this work?" until you can.
- **Test generated code.** Run it, test edge cases, write at least one test for anything non-trivial (from Stage 12 on, mandatory).
- **Question complexity.** Ask "what is the simplest version of this?" and "what are the dependencies this adds?".
- **No AI for the Checkpoint questions.** Those are for you, without notes.

### 1.5 Git and PR habit

The repo is a single root git repo (see the root README). Work like a team member, even alone:

- **One branch per task.** Naming: `s<stage>/<short-task>`, for example `s04/use-debounce-search`, `s09/optimistic-wishlist`.
- **Commit small and often** with imperative messages: `Add useCountdown hook with cleanup`, `Fix stale closure in search effect`.
- **Merge to `main` only when Definition of Done is met.** Squash-merge or merge locally; if you push to GitHub, open a PR to yourself and write 3 lines in the description: what, how verified, what you learned.
- **Tag each stage**: `git tag stage-04-done` after its checkpoint. Tags make the [milestone checklist](#6-milestone-checklist) provable.
- **Never commit** `.env` files, `node_modules`, or API keys (Razorpay test keys included).
- When something breaks, `git bisect` and `git diff` are your first debugging tools. Small branches make them cheap.

### 1.6 Legend

- ⚡ **SKIM**: you already know this. Read the concept in two minutes, do the task as a quick sanity check, move on.
- **B*n***: backend phase `B0`..`B12`. Each stage lists what it needs.
- ☐ / `- [ ]`: tick boxes in your own copy as you go.
- **Stretch**: optional, but marked **(recommended)** where later stages benefit.
- **Observe in DevTools**: a specific thing to look at, not optional for effects, Query and performance topics.

---

## 2. The product: ShopSphere

ShopSphere is a multi-vendor marketplace: customers browse, search, compare and buy; sellers manage their own listings; admins run the platform. You build the **customer storefront** (`/frontend`, SPA on `http://localhost:5173`). Claude builds the **API** (`/backend`, `http://localhost:4000/api/v1`) and the **admin** (`/admin`, TanStack Start on `http://localhost:3000`). The full feature set below is the *destination*; stages deliver it in slices.

### 2.1 Feature catalogue

Priority: **MVP** = needed for a complete purchase journey; **Core** = expected in a production store; **Plus** = polish / differentiator. Stage = where you build it.

#### A. Storefront and home

| Feature | Detail | Pri | Stage |
| --- | --- | --- | --- |
| Hero banner carousel | Admin-managed banners, autoplay with pause on hover/focus, keyboard and swipe, `prefers-reduced-motion` respected | Core | 11, 13 |
| Category mega-menu | Hover/focus-open multi-column menu from the category tree, collapses to a drawer on mobile | Core | 5, 13 |
| Deal rails | "Deals of the day", "Flash sale ends in 02:14:09", horizontal scroll rails with snap | Core | 4, 11 |
| Recently viewed | Rail built from client history for guests, merged with server history after login | Core | 11 |
| Personalized rows | "Recommended for you", "Because you viewed X", "Customers also bought" | Plus | 11 |
| Trending / top rated rows | Server-computed lists | Core | 9 |
| Global header | Logo, search with autocomplete, pincode/location chip, account menu, wishlist, cart badge, notifications bell, theme and language/currency switchers | MVP | 5 to 13 |
| Footer, static pages | About, help, policies | Plus | 5 |

#### B. Search and discovery

| Feature | Detail | Pri | Stage |
| --- | --- | --- | --- |
| Product listing grid/list | Toggle grid and list, responsive, skeleton loading | MVP | 4, 6 |
| Search with debounce | Typing hits the API after 300ms, cancels stale requests | MVP | 4 |
| Autocomplete suggestions | Products, categories, brands, recent searches; arrow-key navigation, ARIA combobox | Core | 11, 12 |
| Facets and filters | Category, brand (multi), price range slider, rating, discount, availability, attributes; counts per facet | MVP | 1, 5, 9 |
| Sort | Relevance, price low/high, rating, newest, discount | MVP | 5 |
| Pagination and infinite scroll | Paginated list with URL page param; "Load more" with `useInfiniteQuery` | MVP | 6, 9 |
| URL as source of truth | Every filter/sort/page lives in the query string and is shareable | Core | 5 |
| Empty and no-result states | "No results", suggestions, clear-filters button | Core | 6 |
| Compare | Pick up to 4 products, side-by-side specs table with differences highlighted | Plus | 8, 11 |

#### C. Product detail page (PDP)

| Feature | Detail | Pri | Stage |
| --- | --- | --- | --- |
| Gallery | Thumbnails, keyboard navigation, hover zoom, fullscreen lightbox | Core | 3, 13 |
| Variants and SKU | Color/size/storage selectors, unavailable combinations disabled, price/stock/images change per variant, variant in URL | MVP | 3, 5 |
| Price block | MRP strike-through, discount %, price, "You save", currency formatting | MVP | 1 |
| Delivery check | Enter pincode, async validation, ETA text, COD availability | Core | 7 |
| Offers | Bank/coupon offers panel, applicable coupons | Core | 11 |
| Specifications and description | Tabbed or sectioned, expandable, anchored | MVP | 3 |
| Q&A | Ask a question, answers, helpful votes | Core | 11 |
| Reviews and ratings | Rating histogram, filter by stars, sort, verified-purchase badge, photo reviews, helpful votes, write-a-review | Core | 11 |
| Similar and related products | Rails below the fold, lazy loaded | Core | 9, 13 |
| Stock/low-stock messaging | "Only 3 left", "Out of stock, notify me" | Core | 9 |
| Share, breadcrumb, structured data | `Product` JSON-LD, Open Graph | Plus | 13 |

#### D. Wishlist

| Feature | Detail | Pri | Stage |
| --- | --- | --- | --- |
| Add/remove from anywhere | Heart on cards and PDP, optimistic toggle | MVP | 6, 9 |
| Wishlist page | Grid, move to cart, price-drop badge, remove, empty state | Core | 9 |
| Guest wishlist | Stored locally, merged on login | Plus | 8, 10 |

#### E. Cart

| Feature | Detail | Pri | Stage |
| --- | --- | --- | --- |
| Guest cart | Works without login (cart token), persists across reloads | MVP | 8, 9 |
| Merge on login | Guest items merged with user cart (sum quantities capped by stock) | Core | 10, 11 |
| Mini cart drawer and cart page | Quantity stepper, remove, line totals, free-shipping progress bar | MVP | 8, 9 |
| Save for later | Move line to "saved", move back | Core | 9, 11 |
| Coupons | Apply/remove, validation messages, discount breakdown | Core | 7, 11 |
| Stock warnings | Per-line "only N left", quantity clamped, line flagged if price/stock changed since added | Core | 9, 11 |
| Totals | Subtotal, discount, shipping, tax, grand total (derived, never stored) | MVP | 1 |

#### F. Checkout

| Feature | Detail | Pri | Stage |
| --- | --- | --- | --- |
| Multi-step flow | Address, delivery, payment, review; progress indicator, back navigation preserves data | MVP | 7, 11 |
| Address step | Choose/add/edit address, pincode lookup | MVP | 7 |
| Delivery slot | Standard/express, date + time slot, per-item ETA | Core | 7, 11 |
| Payment | Razorpay (cards/UPI/netbanking in test mode) and Cash on Delivery | MVP | 11 |
| Order summary and place order | Idempotent submit, disabled during request, double-click safe | MVP | 11 |
| Payment result handling | Success, failure, pending (webhook-confirmed), retry payment | MVP | 11 |
| Confirmation page | Order id, summary, email sent (Mailpit), invoice link | MVP | 11 |

#### G. Orders and returns

| Feature | Detail | Pri | Stage |
| --- | --- | --- | --- |
| Order list | Filter by status/time, search by product, pagination | MVP | 9 |
| Order detail | Items, address, payment, price breakdown | MVP | 9 |
| Tracking timeline | Placed, packed, shipped, out for delivery, delivered; live updates | Core | 11 |
| Cancel order | Before shipping, reason, stock restored, refund initiated | Core | 11 |
| Return / refund | Return request with reason + photos, status, refund state | Core | 11 |
| Invoice download | PDF download from the API, blob handling | Core | 11 |
| Reorder | "Buy again" adds all items to cart | Plus | 11 |

#### H. Account

| Feature | Detail | Pri | Stage |
| --- | --- | --- | --- |
| Profile | Name, phone, avatar upload with preview | Core | 7 |
| Addresses | CRUD, default address, validation | MVP | 6, 7 |
| Security | Change password, active sessions, logout everywhere | Core | 10 |
| Notifications | Preferences + list page | Core | 11 |
| Payment history | Payments table with status and refunds | Core | 11 |
| Preferences | Language, currency, theme | Plus | 13 |

#### I. Auth

| Feature | Detail | Pri | Stage |
| --- | --- | --- | --- |
| Register / login | Email + password, validation, error mapping | MVP | 7, 10 |
| Session | Short-lived access token in memory, rotating refresh cookie, silent refresh | MVP | 10 |
| Email verification | Verify link from Mailpit, resend, unverified banner | Core | 10 |
| Forgot / reset password | Email link, token page, success | Core | 10 |
| Google sign-in | OAuth flow completes via backend redirect | Core | 10 |
| Protected routes and roles | `customer`, `seller`, `admin`, return-to after login | MVP | 5, 10 |
| Session-expiry UX | Toast + redirect preserving intent | Core | 10 |

#### J. Deals and flash sales

| Feature | Detail | Pri | Stage |
| --- | --- | --- | --- |
| Deals page | Active deals, category filter | Core | 11 |
| Flash sale | Countdown driven by server time, per-deal stock bar ("78% claimed"), auto-switch to "ended" | Core | 4, 11 |
| Deal badge on cards | Price crossed-out, "Lightning deal" | Core | 11 |

#### K. Notifications

| Feature | Detail | Pri | Stage |
| --- | --- | --- | --- |
| Bell with unread count | Dropdown list, mark read, mark all read | Core | 11 |
| Real time | Socket.io pushes order status, price drops, deal alerts; falls back to polling | Core | 11 |
| Toasts | Sonner toasts for action feedback | MVP | 8 |

#### L. Seller dashboard (basics, customer-app side)

| Feature | Detail | Pri | Stage |
| --- | --- | --- | --- |
| Become a seller | Application form with validation | Plus | 10, 11 |
| Seller home | Own products list, stock editing, orders to fulfil (a simple role-gated area; heavy tooling lives in `/admin`) | Plus | Admin track |

#### M. Admin (built by Claude in `/admin`)

Analytics (revenue, orders, conversion, top products), product/category/brand CRUD with image upload, orders management and status updates, users and roles, coupons and deals, reviews/Q&A moderation, return approvals, inventory, audit log viewer. You read this code in the [Admin track](#optional-admin-track) to learn TanStack Router/Start by comparison.

#### N. Cross-cutting production features

| Feature | Detail | Pri | Stage |
| --- | --- | --- | --- |
| SEO | Per-route titles/meta/Open Graph via `meta` exports, JSON-LD, canonical, sitemap awareness, SPA caveats | Core | 13, 14 |
| Accessibility | Semantic landmarks, focus management on route change, skip link, ARIA for combobox/dialog/tabs, contrast, reduced motion, axe-clean | MVP | 3, 12, 13 |
| Dark mode | System default, manual toggle, no flash on load | Core | 13 |
| PWA | Manifest, service worker, offline page, installable | Plus | 13 |
| i18n / currency | `Intl` formatting for INR/USD, language switch for key strings, RTL-safe layout | Plus | 13 |
| Error/404/offline states | Route error boundaries, not-found page, offline banner, retry | MVP | 5, 6, 12 |
| Performance | Code-split routes, lazy images, virtualized long lists, LCP/CLS budgets | Core | 13 |
| Observability | Error reporting (Sentry), web-vitals logging | Core | 14 |

### 2.2 Route map

All routes are customer-app routes in `/frontend` unless marked. `Guard`: `public`, `auth` (login required), `role:x`.

| Path | Page | Guard | Stage built | Needs |
| --- | --- | --- | --- | --- |
| `/` | Home (banners, deal rails, recently viewed, recommended) | public | 3 (static), 6, 9, 11 | B0, B4, B8 |
| `/products` | Listing + search + facets (all state in URL) | public | 4, 5, 9 | B0, B1 |
| `/c/:categorySlug` | Category listing (same page, preset filter) | public | 5 | B1 |
| `/p/:productSlug` | Product detail (`?sku=` variant) | public | 3, 5, 9, 11 | B0, B1, B7 |
| `/compare` | Compare up to 4 (`?ids=a,b,c`) | public | 11 | B0 |
| `/deals` | Deals and flash sales | public | 11 | B4 |
| `/cart` | Cart page | public (guest) | 8, 9 | B3 |
| `/checkout` | Multi-step checkout (nested: `address`, `delivery`, `payment`, `review`) | auth | 7, 11 | B2, B5, B6 |
| `/checkout/success/:orderId` | Confirmation | auth | 11 | B5, B6 |
| `/orders` | Order list | auth | 9 | B5 |
| `/orders/:orderId` | Order detail + tracking + cancel + return + invoice | auth | 9, 11 | B5, B9 |
| `/wishlist` | Wishlist | auth (guest local) | 9 | B2 |
| `/account` | Account layout | auth | 5, 7 | B0 |
| `/account/profile` | Profile + avatar | auth | 7 | B0 |
| `/account/addresses` | Address book | auth | 6, 7 | B2 |
| `/account/security` | Password, sessions | auth | 10 | B0, B10 |
| `/account/notifications` | Notification list + prefs | auth | 11 | B9 |
| `/account/payments` | Payment history | auth | 11 | B6 |
| `/login` | Login | public-only | 7, 10 | B0 |
| `/register` | Register | public-only | 7, 10 | B0 |
| `/verify-email` | Verify token page | public | 10 | B10 |
| `/forgot-password` | Request reset | public-only | 10 | B10 |
| `/reset-password` | Set new password (`?token=`) | public | 10 | B10 |
| `/auth/google/callback` | Post-OAuth landing (backend redirects here) | public | 10 | B10 |
| `/seller` | Seller basics (role-gated) | role:seller | Admin track | B11 |
| `/help`, `/policies/:slug` | Static pages | public | 5 | none |
| `/offline` | Offline fallback (PWA) | public | 13 | none |
| `*` | 404 not found | public | 5 | none |
| *(admin app, `:3000`)* `/`, `/products`, `/orders`, `/users`, `/coupons`, `/reviews`, `/analytics` | Built by Claude | role:admin | Admin track | B11 |

### 2.3 Data model overview

This is the shape of the data your frontend will model in TypeScript (Stage 2). Field lists are representative, not exhaustive; the authoritative shapes are in the backend Zod schemas and the Swagger UI at `http://localhost:4000/api/docs`. Money is stored as integer minor units (paise) on the server; the API tells you the convention in `docs/API-CONVENTIONS.md`. Confirm before you format prices.

| Entity | Key fields | Relationships / notes |
| --- | --- | --- |
| **User** | `_id`, `name`, `email`, `phone?`, `avatarUrl?`, `role` (`customer` \| `seller` \| `admin`), `emailVerified`, `createdAt` | Has many Address, Order, Review; one Cart; many WishlistItem |
| **Address** | `_id`, `userId`, `fullName`, `phone`, `line1`, `line2?`, `city`, `state`, `pincode`, `type` (`home` \| `work`), `isDefault` | Belongs to User; copied (snapshotted) into Order at purchase |
| **Category** | `_id`, `name`, `slug`, `parentId?`, `path[]`, `imageUrl?`, `attributeSchema?` | Tree; products belong to leaf categories |
| **Brand** | `_id`, `name`, `slug`, `logoUrl?` | Referenced by Product |
| **Product** | `_id`, `title`, `slug`, `description`, `brandId`, `categoryId`, `images[]`, `basePrice`, `mrp`, `discountPercent`, `ratingAvg`, `ratingCount`, `specs{}`, `tags[]`, `sellerId`, `status` | Has many Variant; indexed for text search |
| **Variant** (SKU) | `sku`, `productId`, `attributes{color,size,...}`, `price`, `mrp`, `stock`, `images[]` | Stock lives here; cart/order lines reference `sku` |
| **Review** | `_id`, `productId`, `userId`, `rating` (1 to 5), `title`, `body`, `photos[]`, `verifiedPurchase`, `helpfulCount`, `status` | One per user per product; feeds `ratingAvg` |
| **Question** | `_id`, `productId`, `userId`, `text`, `answers[{userId, text, isSeller, helpfulCount}]` | Q&A thread |
| **Cart** | `_id`, `userId?` or `guestToken?`, `items[{sku, qty, priceSnapshot, savedForLater}]`, `couponCode?` | Guest cart merged into user cart on login; totals are derived |
| **WishlistItem** | `userId`, `productId`, `addedAt`, `priceAtAdd` | Enables price-drop badge |
| **Coupon** | `code`, `type` (`percent` \| `flat`), `value`, `minOrder`, `maxDiscount?`, `validFrom`, `validTo`, `usageLimit`, `appliesTo` | Validated server-side; frontend only displays |
| **Deal** | `_id`, `productId`/`sku`, `dealPrice`, `startsAt`, `endsAt`, `stockCap`, `claimed` | Flash-sale; countdown uses server time offset |
| **Order** | `_id`, `orderNumber`, `userId`, `items[OrderItem]`, `addressSnapshot`, `status`, `statusHistory[{status, at, note}]`, `pricing{subtotal, discount, shipping, tax, total}`, `paymentMethod`, `createdAt` | Created in a DB transaction with stock decrement |
| **OrderItem** | `sku`, `productId`, `title`, `image`, `unitPrice`, `qty`, `lineTotal` | Snapshot of product at purchase time (price/title may change later) |
| **Payment** | `_id`, `orderId`, `provider` (`razorpay` \| `cod`), `razorpayOrderId?`, `razorpayPaymentId?`, `status` (`created` \| `authorized` \| `captured` \| `failed` \| `refunded`), `amount`, `method?` | Status finalized by webhook, not by the browser |
| **Notification** | `_id`, `userId`, `type`, `title`, `body`, `link?`, `readAt?`, `createdAt` | Pushed via Socket.io, also fetchable |
| **ReturnRequest** | `_id`, `orderId`, `sku`, `reason`, `photos[]`, `status` (`requested` \| `approved` \| `picked_up` \| `refunded` \| `rejected`), `refundAmount?` | Created from order detail |

**Status machine for `Order.status`** (you will model this as a discriminated union in Stage 2 and as a timeline in Stage 11):

```
pending_payment -> placed -> packed -> shipped -> out_for_delivery -> delivered
      |               |                                                  |
      v               v                                                  v
   cancelled       cancelled                                      return_requested -> returned
```

### 2.4 API contract you code against

Read `docs/API-CONVENTIONS.md` in the repo root; this section is the short version you need on day one.

- **Base URL:** `http://localhost:4000/api/v1` (put it in `VITE_API_URL`).
- **Envelope:**
  - success: `{ "success": true, "data": ... , "meta"?: { "page", "limit", "total", "totalPages" } }`
  - failure: `{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details"?: [{ "path": "email", "message": "..." }] } }`
- **Auth:** `Authorization: Bearer <accessToken>` (15 min). Refresh uses an httpOnly cookie, so every request to the API must send `credentials: "include"`, and the server allows origins `:5173` and `:3000` with credentials.
- **Lists:** `?page=1&limit=12&sort=price_asc&search=phone&category=...&brand=...&minPrice=...&maxPrice=...&rating=4`. Exact param names are in Swagger; do not guess, read them.
- **Status codes you must handle:** 400/422 validation, 401 expired or missing token, 403 wrong role, 404, 409 conflict (stock, duplicate), 429 rate limit, 5xx.
- **Dev tooling:** Mongo Express `http://localhost:8081`, Mailpit inbox `http://localhost:8025`, Swagger `http://localhost:4000/api/docs`.

### 2.5 Backend milestones (B0..B12)

Claude builds one phase at a time. **Rule:** ask for the next phase when you start the stage that needs it (column "Ask Claude at"). Each phase ships with tests, Swagger docs and seed data.

| ID | Backend phase | Delivers (endpoints, summarised) | Unlocks stage | Ask Claude at |
| --- | --- | --- | --- | --- |
| **B0** | Scaffold + health + auth + users + products (read) + seed. **Done at start.** | `GET /health`; `POST /auth/register|login|refresh|logout`, `GET /auth/me`; `GET/PATCH /users/me`; `GET /products`, `GET /products/:slug`; seed (~200 products) | S0, S1, S2, S3, S4, S6 (first half) | already done |
| **B1** | Categories, brands, product facets | `GET /categories` (tree), `GET /categories/:slug`, `GET /brands`, facet counts on `GET /products` | S5 (nav, filters), S9 | start of S5 |
| **B2** | Wishlist + addresses | `GET/POST/DELETE /wishlist`, `GET/POST/PATCH/DELETE /addresses`, set default | S6 (CRUD), S7 (forms), S9 | start of S6 |
| **B3** | Cart (guest + merge) | `GET/POST/PATCH/DELETE /cart/items`, guest `x-cart-token`, `POST /cart/merge`, save for later | S8 (shape), S9 (server cart), S11 | start of S9 |
| **B4** | Coupons + deals/flash sales | `POST /cart/coupon`, `DELETE /cart/coupon`, `GET /coupons/available`, `GET /deals`, server time endpoint | S4 (stretch), S11 | start of S11 |
| **B5** | Orders + stock transactions | `POST /orders` (transaction: stock decrement), `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel`, return requests, invoice PDF | S9 (orders list), S11 | start of S11 |
| **B6** | Razorpay payments + webhooks | `POST /payments/razorpay/order`, `POST /payments/razorpay/verify`, `POST /webhooks/razorpay`, COD path, payment history | S11 | before Razorpay topic in S11 |
| **B7** | Reviews, ratings, Q&A + image upload | `GET/POST /products/:id/reviews`, helpful votes, `GET/POST /products/:id/questions`, `POST /uploads/images` | S7 (upload), S11 | before reviews topic in S11 |
| **B8** | Search autocomplete + recommendations + recently viewed | `GET /search/suggest?q=`, `GET /products/:id/similar`, `GET /recommendations`, `POST/GET /me/recently-viewed` | S11, S13 | before autocomplete topic in S11 |
| **B9** | Notifications (Socket.io) + order tracking | `GET /notifications`, mark read, Socket.io namespace with JWT auth, order status events | S11 | before tracking topic in S11 |
| **B10** | Google OAuth + email verification/reset | `GET /auth/google`, `GET /auth/google/callback`, `POST /auth/verify-email`, `POST /auth/forgot-password`, `POST /auth/reset-password`, sessions list | S10 | start of S10 |
| **B11** | Seller + admin endpoints + analytics | `/seller/*`, `/admin/*`, aggregation endpoints (revenue, funnel, top products) | Admin track | before Admin track |
| **B12** | Jobs, caching, audit log, hardening | BullMQ jobs (emails, price-drop alerts), Redis cache, `ETag`/cache headers, audit log, rate limits, CSP | S13, S14 | start of S13 |

> Endpoint names above are the plan, not a promise. After each phase, Claude updates Swagger and `docs/API-CONVENTIONS.md`. The source of truth is always `http://localhost:4000/api/docs`. Read it before coding against a new endpoint.

### 2.6 Which pages are built in which stage

| Stage | Pages / components you ship |
| --- | --- |
| 0 | Blank shell, header/footer placeholder, env wiring |
| 1 | `/products` on static JSON: filters, sort, price histogram; cart-totals utilities |
| 2 | Domain types, typed API helpers |
| 3 | `ProductCard`, `Gallery`, `Tabs`, `VariantPicker`, static PDP |
| 4 | Live product list, debounced search box, `useCountdown` flash-sale strip |
| 5 | Full route tree, layouts, category pages, filter state in URL, guards (stub), 404 |
| 6 | Typed API layer, address book CRUD, wishlist toggle, loading/error/empty/skeleton states |
| 7 | Login/register, address forms, multi-step checkout shell, pincode check, avatar upload |
| 8 | Auth/Theme/Toast context, Zustand cart drawer UI, compare tray, URL-as-state review |
| 9 | Migration of lists to Query; cart, wishlist, orders pages on Query; infinite scroll; optimistic updates |
| 10 | Real auth, verify/reset, Google, role gating, session expiry |
| 11 | Coupons, checkout + Razorpay, orders tracking/cancel/returns/invoice, reviews, Q&A, notifications, deals, recommendations |
| 12 | Test suites, error boundaries, a11y fixes |
| 13 | Performance, dark mode, i18n, SEO, PWA |
| 14 | Build, CI, deploy, Sentry; optional SSR deep dive |

---

## 3. Frontend architecture and conventions

### 3.1 What the scaffold gives you

The `/frontend` scaffold is **React Router v8 (framework tooling) configured as a SPA**, React 19, Tailwind CSS 4, shadcn/ui on **base-ui**, TypeScript (strict), Vite, npm.

- Config: `react-router.config.ts` with `ssr: false` (SPA mode). In SPA mode the build produces static files plus an `index.html` shell; there is no Node server at runtime.
- Routes are **config-based**: `app/routes.ts` using `index()`, `route()`, `layout()`, `prefix()` from `@react-router/dev/routes`. Each route points at a module file under `app/routes/`.
- A route module's default export is the page component. Optional exports you will meet: `meta`, `ErrorBoundary`, `HydrateFallback`, `handle`, `clientLoader`/`clientAction` (the browser-side data APIs, used in Stage 14's deep dive, not before).
- Types for a route's props are generated: `import type { Route } from "./+types/product"`, then `Route.ComponentProps`. Run `npm run typecheck` (`react-router typegen && tsc`) to regenerate.
- Import router APIs from `"react-router"` (v7+ merged `react-router-dom` into it): `Link`, `NavLink`, `Outlet`, `useParams`, `useSearchParams`, `useNavigate`, `useLocation`, `Navigate`.
- You can think of what you write as ordinary **declarative-mode React Router**: components, hooks and `<Outlet>`. You do not need loaders/actions to build the shop. Stage 5 explains the three modes (declarative, data, framework) so you can read all RR documentation correctly.
- Path alias: the scaffold currently maps `~/*` to `./app/*` (`tsconfig.json`) and `components.json` aliases use `~`. This plan uses **`@/`** (a very common convention). Stage 0 has a task that switches the alias to `@/` in `tsconfig.json` and `components.json` consistently. If you prefer to keep `~`, substitute it everywhere in this document. Pick one and never mix.

### 3.2 Suggested folder structure (feature-oriented)

The scaffold uses an `app/` directory (not `src/`). Group by **feature** (a slice of the product), not by file type. Shared, feature-agnostic code goes in `components/`, `hooks/`, `lib/`.

```
frontend/
  app/
    root.tsx                 # <html> shell, providers, global error boundary
    routes.ts                # route config (single source of the route tree)
    app.css                  # Tailwind entry + CSS variables (theme tokens)
    routes/                  # thin route modules: compose features, no business logic
      _layout.shell.tsx      #   header + footer + <Outlet/>
      home.tsx
      products.tsx           #   /products
      product-detail.tsx     #   /p/:productSlug
      cart.tsx
      checkout/
        layout.tsx
        address.tsx
        delivery.tsx
        payment.tsx
        review.tsx
      account/
        layout.tsx
        profile.tsx
        addresses.tsx
        security.tsx
      auth/login.tsx, register.tsx, forgot-password.tsx, reset-password.tsx
      not-found.tsx
    features/                # one folder per product capability
      catalog/
        components/          #   ProductCard, ProductGrid, FilterSidebar, PriceHistogram
        hooks/               #   useProducts, useProductFilters
        api.ts               #   getProducts(), getProduct()  (calls lib/api/client)
        schemas.ts           #   Zod schemas + z.infer types
        utils.ts             #   pure functions: filterProducts, sortProducts, bucketPrices
        utils.test.ts
      product/               #   gallery, variants, reviews UI, Q&A UI
      cart/                  #   CartDrawer, CartLine, cart store (Zustand), totals utils
      wishlist/
      checkout/
      orders/
      account/
      auth/                  #   AuthProvider, useAuth, LoginForm, guards
      notifications/
      deals/                 #   Countdown, FlashSaleStrip
      search/                #   SearchBox, useDebounce usage, suggestions
    components/
      ui/                    # shadcn generated primitives (button.tsx exists). Do not hand-edit lightly
      layout/                # Header, Footer, MegaMenu, PageContainer
      common/                # EmptyState, ErrorState, Skeletons, Price, Rating, Money
    hooks/                   # generic hooks: useDebounce, useLocalStorage, useMediaQuery,
                             #   useCountdown, useOnClickOutside, useIntersection
    lib/
      api/                   # client.ts (fetch wrapper), errors.ts, endpoints.ts, envelope types
      utils.ts               # cn() (exists)
      format.ts              # formatCurrency, formatDate (Intl)
      env.ts                 # parsed, typed import.meta.env
      query-client.ts        # (Stage 9) QueryClient + defaults
      queryKeys.ts           # (Stage 9) key factory
    types/                   # cross-feature shared types
    test/                    # setup.ts, msw handlers, render helper, fixtures
  public/
  e2e/                       # Playwright specs (Stage 12)
  .env.example               # VITE_API_URL=http://localhost:4000/api/v1
```

Rules of thumb:
- **Route files are thin.** They read params, call feature hooks, compose feature components. Logic lives in `features/`.
- **A feature may import from `components/`, `hooks/`, `lib/`. A feature must not import from another feature's internals.** If two features need the same thing, promote it to `components/`, `hooks/` or `lib/`, or export it from the feature's `index.ts` public API.
- **Pure logic is separate from React.** `utils.ts` has no React imports: trivially testable.
- `components/ui/*` are shadcn primitives. Wrap them in `components/common/*` rather than editing them per use.

### 3.3 Adding shadcn components

The scaffold is configured with `components.json` (style `base-nova`, base-ui primitives, Tailwind v4 CSS variables in `app/app.css`). Add components on demand:

```bash
npx shadcn@latest add dialog sheet dropdown-menu tabs input select checkbox skeleton sonner
```

Docs: https://ui.shadcn.com/docs and https://base-ui.com/react/overview/quick-start. Base UI components are headless and accessible (focus management, ARIA), which is why you reach for them for dialogs, menus, tabs and comboboxes instead of hand-rolling.

### 3.4 Conventions

| Area | Convention |
| --- | --- |
| Files | Components `PascalCase.tsx`; hooks `useThing.ts`; utils `camelCase.ts`; route modules `kebab-case.tsx` |
| Exports | **Named exports** for components, hooks, utils. **Default export only** for route modules (the framework requires it) |
| Imports | `@/…` alias for anything outside the current folder; relative only within a feature folder |
| Types | `type` for unions/shapes, `interface` for object contracts you extend; infer from Zod (`z.infer`) at API boundaries; never `any` (use `unknown` and narrow) |
| Props | Always a typed props object; prefer `children` composition over boolean-prop explosions |
| Styling | Tailwind utilities + `cn()`; design tokens as CSS variables in `app.css`; no inline `style` except dynamic values |
| State | Local first; lift only when needed; server data belongs in Query (Stage 9); URL for shareable state; global store only for true client-global UI state |
| Data access | Components never call `fetch` directly. Call `features/*/api.ts`, which call `lib/api/client.ts` |
| Env | Only `VITE_`-prefixed variables reach the browser. **Never put secrets there.** Razorpay `key_id` is public; `key_secret` stays on the server |
| Errors | API errors are normalised into one `ApiError` class (Stage 6); UI shows `error.message`, logs `error.code` |
| Money/dates | Format only at the edge of the UI with `Intl` helpers in `lib/format.ts` |
| Comments | Explain *why*, not *what*. Delete commented-out code |
| Commits | One branch per task, imperative messages, tag at each stage end |
| Lint/format | Prettier (`npm run format`) with the existing no-semicolon style and Tailwind class sorting plugin |

### 3.5 Daily commands

```bash
# from repo root
docker compose up -d                 # Mongo (replica set), Mongo Express :8081, Mailpit :8025
cd backend && npm run dev            # API on :4000
cd frontend && npm run dev           # storefront on :5173
cd frontend && npm run typecheck     # react-router typegen && tsc
cd frontend && npm run format        # prettier
cd frontend && npm test              # (from Stage 12) vitest
```

---

## 4. The 14 stages

Each stage header lists: guide stage, backend dependency, time, branch prefix. Each topic follows the same format: **Concept, Why it matters in ShopSphere, Library/API, Hands-on task, Acceptance criteria, Stretch, Resources**. Topics marked ⚡ **SKIM** are brief on purpose.

---

## Stage 0: Setup and project tour

| | |
| --- | --- |
| **Guide stage** | Foundations (DevTools from stage 7, build awareness from stage 8) |
| **Needs** | **B0** (done). `docker compose up -d` and `cd backend && npm run dev` must work |
| **Time** | 0.5 week (about 5 hours) |
| **Branch prefix** | `s00/` |
| **Pages** | blank shell only |

### 0.1 Tour the scaffold (read before you write)

**Concept.** A React app is a Vite-built bundle. The scaffold uses React Router's tooling on top of Vite: `app/root.tsx` is the document shell, `app/routes.ts` declares the route tree, `app/routes/*.tsx` are page modules, `app/app.css` is the Tailwind entry. In SPA mode (`ssr: false`) the build emits static HTML/JS/CSS and the browser does all rendering.

**Why it matters in ShopSphere.** You will extend this tree for 14 stages. Knowing what each file does prevents "magic" and makes errors readable.

**Library/API.** `react-router.config.ts`, `app/routes.ts` (`index`, `route`, `layout`, `prefix`), `app/root.tsx` (`Layout`, `Outlet`, `ErrorBoundary`, `Meta`, `Links`, `Scripts`, `ScrollRestoration`), `vite.config.ts` (Tailwind and React Router plugins).

**Hands-on task.**
1. Open `react-router.config.ts`. Confirm `ssr: false` (the root setup step set this). Run `npm run dev` and use **View Source** on `http://localhost:5173`: note that the HTML is a near-empty shell. Compare with what the Elements panel shows. That difference *is* client-side rendering.
2. In a notes file `learning-notes.md` (in `frontend/docs/` or your own notes app), write one sentence for each of: `root.tsx`, `routes.ts`, `routes/home.tsx`, `app.css`, `components/ui/button.tsx`, `lib/utils.ts`, `vite.config.ts`, `tsconfig.json`.
3. Create a temporary route `/hello` using `route("hello", "routes/hello.tsx")` that renders `<h1>Hello ShopSphere</h1>`. Visit it, then delete it.

**Acceptance criteria**
- [ ] View Source shows an empty app shell; Elements panel shows rendered DOM; you can state why in one sentence.
- [ ] `/hello` renders and a deliberate typo in the file path in `routes.ts` produces a readable error you can explain.
- [ ] `npm run typecheck` passes.
- [ ] Notes file has 8 one-sentence file descriptions.

**Resources.** React Router modes: https://reactrouter.com/start/modes · SPA mode: https://reactrouter.com/how-to/spa · Routing config: https://reactrouter.com/start/framework/routing · Vite guide: https://vite.dev/guide/ · React quick start: https://react.dev/learn

### 0.2 Environment variables and the API base URL

**Concept.** Vite exposes variables prefixed `VITE_` on `import.meta.env` at *build time*; they are baked into the bundle and visible to every user. Anything secret must stay on the server.

**Why it matters in ShopSphere.** The API URL differs per environment (local, staging, production). Razorpay's *public* key is fine in the browser; its secret is not.

**Library/API.** `import.meta.env.VITE_API_URL`, `.env`, `.env.local`, `.env.example`, `vite/client` types (already in `tsconfig` `types`).

**Hands-on task.**
1. Create `frontend/.env.example` with `VITE_API_URL=http://localhost:4000/api/v1` and copy to `.env.local` (git-ignored).
2. Create `app/lib/env.ts` that reads `import.meta.env.VITE_API_URL`, throws a clear error at startup if missing, and exports a typed `env` object. Add a `vite-env.d.ts` (or `app/env.d.ts`) declaring `ImportMetaEnv` with `VITE_API_URL: string`.
3. Create a throwaway `HealthBadge` component on the home route that fetches `${env.VITE_API_URL}/health` once with `fetch` inside an event handler (a button "Ping API") and shows the JSON. No `useEffect` yet. You will meet the CORS and credentials behaviour for real.

**Acceptance criteria**
- [ ] Removing `VITE_API_URL` makes the app fail fast with your error message, not `undefined/health`.
- [ ] Clicking "Ping API" shows `{ success: true, data: {...} }`, including the DB status.
- [ ] Stopping the backend and clicking again shows a visible error (not just a console message).
- [ ] `.env.local` is not tracked by git; `.env.example` is.

**Resources.** Vite env: https://vite.dev/guide/env-and-mode · MDN CORS: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS · MDN Fetch: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API

### 0.3 Path alias, Prettier, strict TypeScript

**Concept.** Aliases make imports location-independent. Prettier removes style debates. `strict: true` turns on the checks that make TypeScript worth using.

**Why it matters in ShopSphere.** With feature folders, `../../../components/common/Price` becomes unreadable fast.

**Library/API.** `compilerOptions.paths`, `resolve: { tsconfigPaths: true }` in `vite.config.ts` (already present), `components.json` `aliases`, Prettier config with `prettier-plugin-tailwindcss`.

**Hands-on task.**
1. Change `paths` in `tsconfig.json` from `"~/*"` to `"@/*": ["./app/*"]`. Update `components.json` `aliases` to use `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`. Fix existing imports (`app/components/ui/button.tsx` imports `cn`).
2. Run `npm run dev` and `npm run typecheck`; fix what breaks.
3. Run `npm run format`. Confirm Tailwind classes get sorted.
4. Add a deliberate type error (`const n: number = "x"`) and see it fail `npm run typecheck`; remove it.

**Acceptance criteria**
- [ ] No remaining `~/` imports (search the project).
- [ ] `npx shadcn@latest add card` generates files that import via `@/`.
- [ ] `npm run typecheck` and `npm run format` pass on a clean tree.

**Resources.** TS `paths`: https://www.typescriptlang.org/tsconfig/#paths · Prettier: https://prettier.io/docs/configuration · eslint-plugin-react-hooks: https://react.dev/reference/eslint-plugin-react-hooks · shadcn components.json: https://ui.shadcn.com/docs/components-json

### 0.4 Full-stack smoke test and DevTools orientation

**Concept.** You debug a web app with four panes: Elements, Console, Network, Sources (plus React DevTools). Learn them before you need them.

**Why it matters in ShopSphere.** Almost every later "why is this wrong" is answered in Network (what was sent/received) or React DevTools (what props/state).

**Library/API.** Browser DevTools, React Developer Tools extension, `curl`, Swagger UI at `/api/docs`, Mailpit.

**Hands-on task.**
1. Install React Developer Tools. Open Components and Profiler tabs on the running app.
2. With `curl`, call `GET /products?limit=2`, `POST /auth/register` with an invalid body, then a valid one. Compare against the Swagger docs. Note the envelope in both success and error.
3. In DevTools Network: filter by Fetch/XHR, throttle to "Slow 4G", disable cache, read the Timing tab for one request (waiting vs content download).
4. Open Mailpit (`:8025`) and Mongo Express (`:8081`) and locate the user you registered.

**Acceptance criteria**
- [ ] You can find, for any request: URL, method, status, request payload, response body, timing.
- [ ] You have seen a 4xx envelope with `error.code` and can say what each field is for.
- [ ] You can inspect a component's props in React DevTools.

**Resources.** MDN DevTools intro (from your guide): https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Tools_and_testing/Cross_browser_testing/Your_first_look_at_the_Browser_DevTools · Chrome DevTools: https://developer.chrome.com/docs/devtools · React DevTools: https://react.dev/learn/react-developer-tools

### Checkpoint: explain it without notes (Stage 0)
1. Why does View Source show an empty page in SPA mode, and what are the SEO/first-paint trade-offs?
2. What does the `VITE_` prefix do, and why is `VITE_RAZORPAY_KEY_SECRET` a bug?
3. What is CORS, who enforces it (browser or server), and why do cookies need `credentials: "include"` and a non-wildcard origin?
4. What are the first three things you look at in the Network tab when an API call "does not work"?

**Tag:** `git tag stage-00-done`.

---

## Stage 1: JavaScript essentials, applied

| | |
| --- | --- |
| **Guide stage** | 1 JavaScript Essentials |
| **Needs** | **B0** (products read) |
| **Time** | 1 week |
| **Branch prefix** | `s01/` |
| **Pages** | `/products` on static data (a scratch route), pure utility modules |

Most of this you know, so the stage is built as one coherent exercise: **a client-side product explorer over a static JSON snapshot** with filters, sort and a price histogram, plus pure cart-total utilities. All logic is plain TypeScript functions in `features/catalog/utils.ts` and `features/cart/totals.ts` with **no React** inside them. That separation pays off in Stage 12 (testing).

**Setup for the stage.** Snapshot real data once:

```bash
curl 'http://localhost:4000/api/v1/products?limit=100' -o app/test/fixtures/products.json
```

Import it with `import products from "@/test/fixtures/products.json"` (`resolveJsonModule` is on). Check the real shape first (`data` is the array); if the API caps `limit`, call it several times and merge.

> Scratch-running pure TS: Node 24 runs `.ts` files directly (type stripping). For quick experiments: `node scratch/try.ts` using relative imports with `.ts` extensions and `import type`. Remember `verbatimModuleSyntax` is on, so type-only imports must use `import type`.

### 1.1 ⚡ SKIM: Destructuring, spread, rest, immutability

**Concept.** Spread/rest and destructuring let you build new objects/arrays instead of mutating old ones. React compares references; mutated state looks unchanged.

**Why it matters in ShopSphere.** Cart lines, filter state and form values are updated immutably everywhere.

**Library/API.** `{...obj, key: v}`, `[...arr, x]`, `arr.with(i, v)`, `arr.toSorted()`, `arr.toSpliced()`, `structuredClone()`.

**Hands-on task.** Write `updateQty(lines, sku, qty)`, `removeLine(lines, sku)`, `toggle(set, id)` as pure functions returning new arrays/objects. Prove no mutation by `Object.freeze`-ing the input (deep-freeze helper) and showing nothing throws in strict mode.

**Acceptance criteria**
- [ ] The three functions work on frozen input.
- [ ] You can state why `arr.push` then `setArr(arr)` fails to re-render.

**Resources.** MDN destructuring: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring · spread: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax · React updating objects: https://react.dev/learn/updating-objects-in-state · React updating arrays: https://react.dev/learn/updating-arrays-in-state

### 1.2 filter, map, find, some, every: the listing filters

**Concept.** `filter` keeps elements matching a predicate, `map` transforms each, `find` returns the first match, `some`/`every` test conditions. They return new arrays and compose.

**Why it matters in ShopSphere.** Listing facets (brand, price, rating, availability, discount) are exactly a conjunction of predicates. The same logic runs on the server for real; here you build it client-side so you *understand* what the API's query params mean.

**Library/API.** `Array.prototype.filter/map/find/some/every/includes`, `Set`, `Intl.NumberFormat` (later).

**Hands-on task.** In `features/catalog/utils.ts` write `filterProducts(products, filters)` where `filters` is `{ brands: string[]; minPrice?: number; maxPrice?: number; minRating?: number; inStockOnly?: boolean; minDiscount?: number; search?: string }`. Empty/undefined filters must not restrict. Search matches title and brand case-insensitively. Then build a throwaway `/scratch/explorer` route that renders the result count and a plain list, with controls for each filter (plain inputs, local `useState`).

**Acceptance criteria**
- [ ] Each filter works alone and combined; empty filters return everything.
- [ ] Brand multi-select uses a `Set` for O(1) lookups.
- [ ] Function is pure (no reads of globals, no mutation of `products`).
- [ ] Manually verified: 5 filter combinations whose expected counts you computed by hand from the JSON.

**Stretch (recommended).** Return `{ items, facets }` where `facets.brands` is `Record<brand, count>` computed *against the other active filters* (the "disjunctive facet" problem). Note how the backend B1 facet counts must do the same.

**Resources.** MDN Array methods: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array · MDN JS Guide (from your guide): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide · React rendering lists: https://react.dev/learn/rendering-lists

### 1.3 reduce and groupBy: cart totals and the price histogram

**Concept.** `reduce` folds an array into one value (a number, an object, a map). `Object.groupBy` / `Map.groupBy` (ES2024, available in Node 24 and current browsers) group items by key.

**Why it matters in ShopSphere.** Cart subtotal, discount, shipping and tax are `reduce` over lines. The price-range slider histogram and brand facet counts are group-and-count. Totals are **derived data**: never stored in state, always computed.

**Library/API.** `reduce(fn, initial)`, `Object.groupBy`, `Map.groupBy`, `Object.entries`, `Object.fromEntries`, `Math.min/max`, `Intl.NumberFormat` for display.

**Hands-on task.**
1. `features/cart/totals.ts`: `computeTotals(lines, { coupon?, shippingRules })` returning `{ subtotal, discount, shipping, tax, total, savings }`. Rules: shipping free above 499, else 40; tax 18% on discounted subtotal; coupon is `{type:'percent'|'flat', value, maxDiscount?, minOrder?}`. Use integer paise throughout and round once at the end.
2. `priceHistogram(products, bucketCount)` returns `[{ from, to, count }]` buckets across min..max. Render as a simple bar histogram with `div`s on the scratch explorer, above the price inputs; clicking a bar sets min/max.
3. `brandCounts(products)` via `Map.groupBy`, sorted by count desc then name.

**Acceptance criteria**
- [ ] Totals for 6 hand-calculated carts match exactly (including a coupon that hits `maxDiscount` and one below `minOrder`).
- [ ] No floating-point artefacts (`0.1 + 0.2` style); money is integer minor units until display.
- [ ] Histogram buckets sum to `products.length`; an empty list or a single-price list does not crash or divide by zero.

**Resources.** MDN reduce: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce · Object.groupBy: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy · MDN Intl.NumberFormat: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat

### 1.4 sort and comparators

**Concept.** `sort` mutates in place and takes a comparator returning negative/zero/positive. `toSorted` returns a copy. Sorting strings needs `localeCompare`. Sort is stable in modern engines.

**Why it matters in ShopSphere.** Sort dropdown: price asc/desc, rating, newest, discount. Sorting state props in React must never mutate.

**Library/API.** `Array.prototype.toSorted`, `localeCompare`, `Intl.Collator`, comparator composition (tie-breakers).

**Hands-on task.** `sortProducts(products, sortKey)` with keys `relevance | price_asc | price_desc | rating | newest | discount`. Ties break by rating desc, then title. Write a `compareBy(...selectors)` helper to compose comparators.

**Acceptance criteria**
- [ ] Original array unchanged (verify by reference and content).
- [ ] Stable result for equal prices (tie-breaker visible).
- [ ] Titles with accents sort sensibly via `localeCompare`.

**Resources.** MDN sort: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort · toSorted: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSorted

### 1.5 ⚡ SKIM: Optional chaining, nullish coalescing, defensive data

**Concept.** `?.` short-circuits on `null/undefined`; `??` supplies defaults only for `null/undefined` (unlike `||`, which also swallows `0` and `""`).

**Why it matters in ShopSphere.** A price of `0` or a discount of `0` is valid. `||` would show the wrong thing. API fields may be missing (`product.brand?.name`).

**Library/API.** `?.`, `??`, `??=`, `Number.isFinite`.

**Hands-on task.** Write `displayDiscount(product)` returning `"No discount"` for `0` and `undefined`, `"20% off"` otherwise, and `safeBrandName(p)`. Add three tests-as-assertions in a scratch script (`console.assert`).

**Acceptance criteria**
- [ ] `0` is rendered as `0`, never replaced by a default.
- [ ] You can explain `a || b` vs `a ?? b` with a ShopSphere example.

**Resources.** MDN `??`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing · optional chaining: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining

### 1.6 Promises and async/await against the real API

**Concept.** A `Promise` represents a future value; `async/await` is syntax over promises. `fetch` resolves on *any* HTTP response (even 404/500); it only rejects on network failure. You must check `response.ok`. `Promise.all` runs in parallel and fails fast; `Promise.allSettled` collects all outcomes.

**Why it matters in ShopSphere.** Every screen from Stage 4 on is async. The home page will fetch banners, deals, categories and recommendations concurrently; one failing rail must not blank the page.

**Library/API.** `fetch`, `Response.ok/.status/.json()`, `try/catch/finally`, `Promise.all/allSettled/race`, `AbortController` (introduced here, used heavily in Stage 4), `setTimeout`-based `sleep`.

**Hands-on task.** In a scratch script or route (no React effects yet):
1. `getJson<T>(url)` that throws a descriptive `Error` when `!response.ok`, including status and parsed error envelope message.
2. `loadHomeData()` that fetches `/products?limit=8&sort=newest`, `/products?limit=8&sort=rating`, and a deliberately wrong URL in parallel using `Promise.allSettled`, returning `{ newest, topRated, errors }`.
3. `withTimeout(promise, ms)` using `Promise.race` and `AbortController` to abort the request after 3s. Test using DevTools "Slow 3G" and "Offline".

**Acceptance criteria**
- [ ] A 404 from the API surfaces as a thrown error (you proved `fetch` alone does not).
- [ ] The failing request does not prevent the other two results from rendering.
- [ ] Aborting produces an `AbortError` that you distinguish from real failures (`error.name === "AbortError"`).
- [ ] You can explain the difference between `await a(); await b();` and `await Promise.all([a(), b()])` with measured timings from the Network tab.

**Resources.** MDN Promises: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises · async functions: https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS · AbortController: https://developer.mozilla.org/en-US/docs/Web/API/AbortController · Promise.allSettled: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled

### 1.7 ⚡ SKIM: Modules and boundaries

**Concept.** ES modules: named vs default exports, one-way dependency graph, side-effect-free modules enable tree shaking.

**Why it matters in ShopSphere.** The folder structure in [3.2](#32-suggested-folder-structure-feature-oriented) is a module-boundary policy.

**Library/API.** `import`/`export`, `export type`, barrel files (`index.ts`) with caution, dynamic `import()`.

**Hands-on task.** Reorganise Stage 1 code into `features/catalog/utils.ts`, `features/cart/totals.ts`, `lib/format.ts` (`formatCurrency(paise, currency="INR", locale="en-IN")` using `Intl.NumberFormat`). Add `features/catalog/index.ts` exporting only the public API. Create a circular import on purpose, observe the problem, fix it.

**Acceptance criteria**
- [ ] No utility imports from `react`.
- [ ] `formatCurrency(1299900)` prints `₹12,999.00` (or `₹12,999`, your choice, applied consistently).
- [ ] You can explain why barrel files can hurt tree-shaking and circular imports cause `undefined` at runtime.

**Resources.** MDN modules: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules

### Checkpoint: explain it without notes (Stage 1)
1. What does `reduce` return for an empty array if you omit the initial value? Why does that matter for an empty cart?
2. Why is `sort()` on a prop array a bug in React, and what are two fixes?
3. Why does `fetch("/missing")` not throw? Write the `if` that makes it throw.
4. What is the difference between `||` and `??`, with a price example?
5. Why should cart totals be computed and never stored in state?

**Tag:** `git tag stage-01-done`.

---

## Stage 2: TypeScript essentials, applied

| | |
| --- | --- |
| **Guide stage** | 2 TypeScript Essentials |
| **Needs** | **B0** (response shapes; Swagger) |
| **Time** | 1 week |
| **Branch prefix** | `s02/` |
| **Pages** | none new; typed domain layer |

You only type props today. This stage builds the **type layer** the rest of the app depends on: domain models, discriminated unions for async state and order status, generics for API helpers, and Zod schemas at the boundary where untyped JSON enters.

### 2.1 Everyday types: modelling the domain

**Concept.** `type` and `interface` describe shapes; optional properties (`?`), readonly, literal types, arrays and tuples. TypeScript is structural: shapes match, names do not matter. Types are erased at runtime.

**Why it matters in ShopSphere.** Every API response is a shape. A mis-typed `price` (string vs number) becomes a production bug three screens later.

**Library/API.** `type`, `interface`, `readonly`, union of string literals, `Record<K, V>`, template literal types (light).

**Hands-on task.** Create `app/types/domain.ts` (or per-feature `types.ts`) with `User`, `Address`, `Category`, `Brand`, `Product`, `Variant`, `CartItem`, `Cart`, `Order`, `OrderItem`, `Payment`, `Review`, `Coupon`, `Deal`, using the [data model](#23-data-model-overview) and the real response from Swagger. Use `type Money = number` and `type ISODateString = string` aliases to give meaning. Type the Stage 1 fixtures and fix every error TS reveals (it will find optional fields you assumed existed).

**Acceptance criteria**
- [ ] `products.json` import is checked against `Product[]` (via `satisfies` or a typed loader), and mismatches are either fixed in the type or understood.
- [ ] No `any` anywhere in the domain files.
- [ ] You can explain when you would choose `interface` vs `type` (and that for this app either is fine; be consistent).

**Resources.** Handbook everyday types: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html · object types: https://www.typescriptlang.org/docs/handbook/2/objects.html · TS Handbook (from your guide): https://www.typescriptlang.org/docs/handbook/

### 2.2 Unions, narrowing, discriminated unions, exhaustiveness

**Concept.** A union (`A | B`) is "one of these". Narrowing (`typeof`, `in`, equality, `Array.isArray`, user-defined guards) makes TS know which one inside a branch. A **discriminated union** has a literal tag property so `switch` narrows precisely. A `never` check makes a `switch` exhaustive: adding a new member breaks compilation until handled.

**Why it matters in ShopSphere.** Async UI state is not three booleans (`isLoading`, `isError`, `data`) that can contradict each other. And `Order.status` drives the whole tracking UI.

**Library/API.** `type AsyncState<T> = {status:"idle"} | {status:"loading"} | {status:"success"; data:T} | {status:"error"; error:ApiError}`; `OrderStatus` union; `assertNever(x: never): never`.

**Hands-on task.**
1. Define `AsyncState<T>` and a `renderState(state)` function that returns UI text for each state; make TS error if you forget one.
2. Define `OrderStatus` (from the status machine) and `statusLabel(status)`, `statusColor(status)`, `canCancel(status)`, `canReturn(status)` using `switch` + `assertNever`.
3. Define `PaymentMethod = { type: "razorpay"; razorpayOrderId: string } | { type: "cod"; note?: string }` and write `describePayment(m)`.
4. Add a new status `refunded` to the union and watch the compiler list every function you must update.

**Acceptance criteria**
- [ ] Adding a union member causes compile errors in every switch (screenshot or note).
- [ ] You can show a case where the three-booleans approach represents an impossible state (`isLoading && isError`) and why the union cannot.
- [ ] `canCancel("delivered")` is `false`; unit-checked with `console.assert`.

**Resources.** Handbook narrowing: https://www.typescriptlang.org/docs/handbook/2/narrowing.html · unions: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types · discriminated unions: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions

### 2.3 `unknown` vs `any`, and untyped data

**Concept.** `any` turns off checking; `unknown` forces you to narrow before use. `response.json()` returns `Promise<any>` in lib typings, which silently makes your whole data layer unsafe. `as Product` is a lie to the compiler, not a check.

**Why it matters in ShopSphere.** The backend can change a field name; `as` hides it until a user sees `NaN`. Validation at the boundary catches it immediately (you will do this with Zod in 2.6).

**Library/API.** `unknown`, type guards (`x is T`), `as const`, `satisfies`.

**Hands-on task.** Write `isApiError(x: unknown): x is ApiErrorEnvelope` by hand (check `success === false`, `error` is an object with string `code` and `message`). Use it in the `getJson` helper from 1.6 so the thrown error has typed fields. Then make `getJson` return `Promise<unknown>` and see which call sites no longer compile.

**Acceptance criteria**
- [ ] No `any` in your API layer; no `as` casts on JSON (except within the guard's own implementation, commented).
- [ ] Passing a malformed envelope to `isApiError` returns `false`.

**Resources.** unknown: https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown · type predicates: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates · `noUncheckedIndexedAccess`: https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess

### 2.4 Generics, practically

**Concept.** Generics parameterize types over other types: a function or type that works for many shapes while keeping them related (`identity<T>(x: T): T`). Constrain with `extends`. You mostly *use* generics (reading `useState<T>`, `Promise<T>`, `Record<K,V>`) and write simple ones.

**Why it matters in ShopSphere.** One `ApiResponse<T>`, one `Paginated<T>`, one `useFetch<T>` serve every endpoint without duplication.

**Library/API.** `type ApiSuccess<T> = { success: true; data: T; meta?: PageMeta }`, `type Paginated<T> = { items: T[]; meta: PageMeta }`, generic functions with defaults and constraints, utility types `Pick`, `Omit`, `Partial`, `Required`, `Record`, `ReturnType`, `Awaited`, `NonNullable`.

**Hands-on task.**
1. `type ApiResponse<T> = ApiSuccess<T> | ApiFailure` (discriminated by `success`).
2. `async function request<T>(path: string, init?: RequestInit): Promise<T>` that unwraps the envelope (returns `data` or throws `ApiError`). Use it for `getProducts(): Promise<Paginated<Product>>`.
3. Utility types: `type ProductCardData = Pick<Product, "slug" | "title" | "images" | "basePrice" | "mrp" | "ratingAvg">`; `type CartItemInput = Omit<CartItem, "priceSnapshot">`; `type ProductFilters = Partial<...>`.
4. Write `groupBy<T, K extends PropertyKey>(items: T[], key: (item: T) => K): Record<K, T[]>` and use it in the brand facet.

**Acceptance criteria**
- [ ] `request<Product[]>("/products")` has the right return type; a wrong generic fails at the call site.
- [ ] `getProducts` and `getProduct` are one-liners over `request<T>`.
- [ ] You can read `Record<string, Pick<Product, "title">[]>` aloud.

**Resources.** Handbook generics: https://www.typescriptlang.org/docs/handbook/2/generics.html · utility types: https://www.typescriptlang.org/docs/handbook/utility-types.html · Udemy (your guide) "Understanding TypeScript": https://www.udemy.com/course/understanding-typescript/

### 2.5 Typing React code: props, events, children, hooks

**Concept.** Typed components: props object type, `children: React.ReactNode`, event types (`React.ChangeEvent<HTMLInputElement>`, `React.FormEvent<HTMLFormElement>`, `React.MouseEvent<HTMLButtonElement>`), `useState<T>`, `useRef<HTMLDivElement>(null)`, extending native props with `React.ComponentProps<"button">`, and generic components.

**Why it matters in ShopSphere.** Your design-system wrappers (`Price`, `Rating`, `Money`, `EmptyState`) must accept native attributes and stay type-safe.

**Library/API.** `React.ReactNode`, `React.ComponentProps<"input">`, `React.PropsWithChildren`, `React.ElementRef`, `useState<T | null>(null)`, typing reducers, `Route.ComponentProps` from RR typegen.

**Hands-on task.**
1. `Rating` component: `{ value: number; count?: number; size?: "sm" | "md" } & React.ComponentProps<"div">`.
2. A generic `List<T>` component: `{ items: T[]; getKey: (item: T) => string | number; renderItem: (item: T) => React.ReactNode; empty?: React.ReactNode }`, used for products and for orders.
3. `useToggle(initial = false)` returning `[boolean, () => void, (v: boolean) => void]` with correct tuple typing (`as const`).
4. A controlled `QuantityInput` handling `onChange` events with correct event types and numeric parsing.

**Acceptance criteria**
- [ ] `<List items={products} .../>` infers `T = Product` with no annotation; passing a wrong `renderItem` param type fails.
- [ ] `useToggle` destructures as a typed tuple, not a union array.
- [ ] No `React.FC` is used; you can state the trade-off (children typing, generics) in one sentence.

**Resources.** TypeScript React handbook page (from your guide): https://www.typescriptlang.org/docs/handbook/react.html · React TypeScript Cheatsheets: https://react-typescript-cheatsheet.netlify.app/ · React docs TS: https://react.dev/learn/typescript · Udemy (your guide): https://www.udemy.com/course/react-typescript-the-practical-guide/

### 2.6 Zod 4: runtime schemas and `z.infer`

**Concept.** TypeScript types vanish at runtime. **Zod** validates data at runtime and infers the static type from the same schema, so the two cannot drift. Use `schema.parse` (throws) or `safeParse` (returns `{ success, data | error }`). Use `z.infer<typeof S>` for output and `z.input<typeof S>` for pre-transform input.

**Why it matters in ShopSphere.** Zod is the shared language for API parsing (here), form validation (Stage 7) and the backend (the same library, so contracts align).

**Library/API.** `import { z } from "zod"` (Zod 4): `z.object`, `z.string().min()`, `z.email()`, `z.url()`, `z.number().int().positive()`, `z.enum([...])`, `z.array`, `z.optional`, `z.nullable`, `z.discriminatedUnion("type", [...])`, `z.coerce.number()`, `.default()`, `.transform()`, `.refine()`, `.superRefine()`, `z.infer`, `z.input`, `z.output`. Custom messages: `z.string().min(8, { error: "At least 8 characters" })` (Zod 4's `error` param; `message` is still accepted).

**Hands-on task.**
1. In `features/catalog/schemas.ts` write `productSchema`, `paginatedSchema(itemSchema)` (a function returning a schema) and `apiEnvelopeSchema(dataSchema)`.
2. `type Product = z.infer<typeof productSchema>`, replacing the hand-written type.
3. Make `request<T>` accept an optional schema; when given, `safeParse` the `data` and throw a distinct `ContractError` (with the Zod issues logged) on mismatch.
4. Break the contract deliberately (rename a field in the schema) and watch the error pinpoint the path.

**Acceptance criteria**
- [ ] `Product` type comes only from Zod; no duplicate hand-written interface remains.
- [ ] A wrong field type from the API results in a `ContractError`, not a rendered `NaN`.
- [ ] You can explain `parse` vs `safeParse` and `z.input` vs `z.infer`.
- [ ] `z.coerce.number()` is used for a query-string number and you can explain its pitfall (`""` coerces to `0`).

**Stretch (recommended).** Parse API responses in development only (strict) and skip in production for speed, via `import.meta.env.DEV`; discuss the trade-off.

**Resources.** Zod docs: https://zod.dev · basics: https://zod.dev/basics · API: https://zod.dev/api · Zod 4 changelog: https://zod.dev/v4

### Checkpoint: explain it without notes (Stage 2)
1. Why is `any` contagious? Give an example of how one `response.json()` poisons a component tree.
2. Draw `AsyncState<Product[]>` and explain what impossible states it rules out.
3. How does `assertNever` make adding `"refunded"` safe?
4. Why use `z.infer` instead of writing the interface by hand?
5. What is the difference between `Pick`, `Omit` and `Partial`? When would each appear in ShopSphere?

**Tag:** `git tag stage-02-done`.

---

## Stage 3: React fundamentals refresh

| | |
| --- | --- |
| **Guide stage** | 3 React Fundamentals |
| **Needs** | **B0** (static or fixture data is fine) |
| **Time** | 0.5 week (⚡ most of it is skim) |
| **Branch prefix** | `s03/` |
| **Pages** | `ProductCard`, `ProductGrid`, `Gallery`, `Tabs`, `VariantPicker`, static PDP |

You are solid here, so every topic is a **sanity task** that produces a reusable component for later. If a task feels trivial, go faster, but do not skip the "observe" items: they set up Stage 4 and Stage 13.

### 3.1 ⚡ SKIM: Components, JSX, composition: `ProductCard`

**Concept.** Components are functions of props returning JSX; compose small ones into larger ones. Prefer `children`/slots over configuration flags.

**Why it matters in ShopSphere.** `ProductCard` appears on home rails, listings, search, wishlist, recommendations and compare. It must be flexible without a 20-prop API.

**Library/API.** Components, props, `children`, Tailwind, shadcn `Button`/`Card`, `lucide-react` icons, `Link` from `react-router`.

**Hands-on task.** Build `ProductCard` (image with fixed aspect ratio, brand, 2-line clamped title, `Rating`, `Price` with MRP strike-through and discount badge, "Add to cart" button, wishlist heart). Support compound slots: `<ProductCard><ProductCard.Badge>Lightning deal</ProductCard.Badge>...</ProductCard>` or a simple `badge` prop, your choice. Render 24 from the fixture in `ProductGrid` (responsive 2/3/4/5 columns).

**Acceptance criteria**
- [ ] Looks right at 360, 768, 1280 px; no layout shift when images load (aspect-ratio box).
- [ ] Card is a single link target (title link) with clickable heart/cart buttons not nested inside the link (no interactive-in-interactive).
- [ ] Out-of-stock variant: dimmed, "Notify me" instead of "Add to cart".
- [ ] `Price` and `Rating` live in `components/common/` and are reused.

**Resources.** React Learn (from your guide): https://react.dev/learn · Your first component: https://react.dev/learn/your-first-component · passing props: https://react.dev/learn/passing-props-to-a-component · Reference (from your guide): https://react.dev/reference/react

### 3.2 ⚡ SKIM: Lists and keys (with the key-bug demo)

**Concept.** Keys let React match elements between renders. Use a stable unique id; array index keys break when lists reorder, filter or insert, causing state to attach to the wrong item.

**Why it matters in ShopSphere.** Sorting and filtering the grid with stateful cards (a heart toggle, a quantity) is the classic place keys bite.

**Library/API.** `key`, `Array.map`, React DevTools highlight updates.

**Hands-on task.** Give `ProductCard` local state (`liked`). Render the grid with `key={index}`, like the third card, then change the sort. Observe the heart stays on position 3 (wrong item). Switch to `key={product._id}` and observe the fix. Write what you saw in two sentences in your notes.

**Acceptance criteria**
- [ ] You reproduced the bug and the fix.
- [ ] No `key` warnings anywhere; keys are product ids.

**Resources.** Rendering lists: https://react.dev/learn/rendering-lists · Why keys: https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key

### 3.3 State and derived values: `Gallery`, `Tabs`, `VariantPicker`

**Concept.** State is the minimal data that changes; everything else is *derived* during render. Do not copy props into state, and do not store something you can compute (selected variant object vs selected variant id).

**Why it matters in ShopSphere.** PDP has several interacting selections: image index, color, size, quantity. Duplicated state creates sync bugs and leads you toward `useEffect` for the wrong reasons (a Stage 4 theme).

**Library/API.** `useState`, derived values, conditional rendering, base-ui/shadcn `Tabs`, `useId`.

**Hands-on task.**
1. `Gallery`: thumbnails + main image, selected index in state, arrow-key navigation, wraps around, `aria-label`s, preloads the next image.
2. `VariantPicker`: given `variants[]` with `attributes: { color, storage }`, render option groups; the selected state is `{ color?: string; storage?: string }`; derive the matching `Variant` (or `undefined`), disabled options (combinations that do not exist or are out of stock), price and stock message.
3. `Tabs` (shadcn `tabs` on base-ui) for Description / Specifications / Reviews / Q&A.
4. Assemble a static PDP at `/p/:productSlug` reading from the fixture (no fetching yet).

**Acceptance criteria**
- [ ] Only the selected attribute values are in state; the variant, price and stock text are derived in render.
- [ ] Selecting a color that makes the current storage invalid does not leave the UI in an invalid state (clear or adjust it).
- [ ] Gallery and tabs are fully keyboard operable.
- [ ] You can point at every piece of state and say why it cannot be derived.

**Resources.** State: https://react.dev/learn/state-a-components-memory · Choosing state structure: https://react.dev/learn/choosing-the-state-structure · Don't mirror props in state: https://react.dev/learn/choosing-the-state-structure#avoid-redundant-state

### 3.4 ⚡ SKIM: Events and controlled inputs: `QuantityStepper`, review box

**Concept.** Controlled inputs: `value` + `onChange`, state is the single source of truth. Form `onSubmit` with `preventDefault`. Events bubble; stopping propagation has costs.

**Why it matters in ShopSphere.** Quantity steppers appear in cart, PDP and wishlist-to-cart. You will replace hand-rolled form state with React Hook Form in Stage 7, so learn precisely what you are replacing.

**Library/API.** `onChange`, `onClick`, `onSubmit`, `inputMode`, `min/max`, `type="number"` pitfalls.

**Hands-on task.** `QuantityStepper` (min 1, max = stock, buttons plus typed input, clamps on blur, disables at limits, announces changes via `aria-live`). Then a "write a review" textarea with a 500-char counter and star picker (radio group semantics) that logs the payload on submit.

**Acceptance criteria**
- [ ] Typing `""`, `0`, `-1`, `999`, `abc` never produces an invalid committed quantity.
- [ ] Star picker works with arrow keys and has labels for screen readers.
- [ ] Submit is blocked when empty and the first invalid field gets focus.

**Resources.** Responding to events: https://react.dev/learn/responding-to-events · Reacting to input with state: https://react.dev/learn/reacting-to-input-with-state · `<input>` reference: https://react.dev/reference/react-dom/components/input

### 3.5 ⚡ SKIM: Preserving and resetting state with `key`

**Concept.** React keeps state by position in the tree and component type. Changing a component's `key` throws away its state, a deliberate reset.

**Why it matters in ShopSphere.** Navigating between two products in the same route component must reset the selected image/variant/quantity. Without a reset, product B opens with product A's selection.

**Library/API.** `key` as identity, `Route.ComponentProps` `params`.

**Hands-on task.** Place a "Related product" link on the PDP that navigates to another `/p/:slug`. Reproduce the stale state bug (selected color carries over), then fix it by rendering `<ProductDetail key={slug} product={...} />`.

**Acceptance criteria**
- [ ] Switching products resets gallery index, variant and quantity.
- [ ] You can explain why `useEffect(() => setIndex(0), [slug])` is the worse fix (extra render, flash of wrong state).

**Resources.** Preserving and resetting state: https://react.dev/learn/preserving-and-resetting-state · You Might Not Need an Effect: https://react.dev/learn/you-might-not-need-an-effect

### 3.6 Accessible components from primitives

**Concept.** Use semantic HTML first (`button`, `a`, `label`, `nav`, `main`). When you need complex widgets (dialog, menu, tabs, combobox, popover), use accessible primitives (base-ui) instead of re-implementing focus traps and ARIA.

**Why it matters in ShopSphere.** Mega-menu, cart drawer, filter sheet on mobile, autocomplete and checkout steps are all complex widgets; accessibility is a feature (and a Stage 12 acceptance test).

**Library/API.** shadcn `dialog`, `sheet`, `dropdown-menu`, `tabs`, `sonner`, `useId`, `aria-label`, `aria-live`, visually-hidden utilities (`sr-only`).

**Hands-on task.** Add a skip link ("Skip to content") and landmarks (`header`, `nav`, `main`, `footer`) to a shell layout; add a `CartDrawer` skeleton using shadcn `sheet` (open from header button). Keyboard-test: Tab order, Esc to close, focus returns to the trigger.

**Acceptance criteria**
- [ ] Using only the keyboard you can open the drawer, tab inside it, close it, and focus returns to the trigger.
- [ ] Each image has meaningful `alt` (or `alt=""` if decorative); icon-only buttons have `aria-label`.
- [ ] Lighthouse accessibility score for the static PDP is at least 90 (record the number).

**Resources.** Base UI: https://base-ui.com/react/overview/quick-start · shadcn: https://ui.shadcn.com/docs · MDN ARIA: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA

### Checkpoint: explain it without notes (Stage 3)
1. What exactly does React use `key` for, and what breaks with index keys?
2. Name three pieces of PDP state that should be derived, not stored.
3. How do you reset a component's state when a prop identity changes, and why is that better than an effect?
4. Why must a card not nest a `<button>` inside an `<a>`?
5. Controlled vs uncontrolled input: one benefit and one cost of each.

**Tag:** `git tag stage-03-done`.

---

## Stage 4: Hooks and effects

| | |
| --- | --- |
| **Guide stage** | 4 React Application Development: Hooks, Effects and Async UI Behavior |
| **Needs** | **B0** (`GET /products?search=...`). Flash-sale timer uses a fake end time now; real data arrives in B4 (Stage 11) |
| **Time** | 2 weeks (this is the biggest knowledge gap; do not rush it) |
| **Branch prefix** | `s04/` |
| **Pages** | live `/products` list, header search box, flash-sale strip on home |

This stage is where "static UI developer" becomes "application developer". You will hand-write the data fetching that TanStack Query will replace in Stage 9. **That is deliberate.** Query's value is only obvious once you have felt the pain: loading flags, race conditions, stale data, duplicate requests, cleanup.

> Keep **React StrictMode** on. In development it mounts, unmounts and re-mounts every component once, so effects run **twice**. That is a feature: it exposes missing cleanup. Production runs once.

### 4.1 The effect mental model (and when not to use one)

**Concept.** An effect is not "run this after render". It is "**synchronize this component with an external system**" (network, timers, DOM APIs, subscriptions, third-party widgets). It describes *how to start* the sync, *how to stop* (cleanup), and *what values it depends on*. React re-runs it when dependencies change. If there is no external system, you probably do not need an effect: compute during render, handle in an event handler, or reset with `key`.

**Why it matters in ShopSphere.** The shop is full of external systems (API, WebSocket, timers, `localStorage`, `IntersectionObserver`, Razorpay's script). It is also full of tempting wrong effects ("when filters change, set the filtered list in state").

**Library/API.** `useEffect(setup, deps)`, cleanup function, the three dependency forms (`[]`, `[a, b]`, omitted), StrictMode behaviour, `eslint-plugin-react-hooks` (`exhaustive-deps`).

**Hands-on task.**
1. Convert the Stage 0 "Ping API" button into a `HealthBadge` that checks `/health` **on mount** with `useEffect`. Log "effect start" and "cleanup" to the console. Observe two start/cleanup pairs in dev (StrictMode).
2. Take the Stage 1 explorer's filtering. Write it the **wrong** way first (`useEffect` that sets `filtered` state whenever `filters` change). Count renders using a ref counter. Rewrite as plain derived data (`const filtered = filterProducts(products, filters)`). Compare render counts and code size.
3. Read "You Might Not Need an Effect" and list in your notes five cases from it that apply to ShopSphere.

**Acceptance criteria**
- [ ] You can explain why you see the effect run twice and prove the second run is correct because cleanup ran in between.
- [ ] The derived version renders fewer times and has no intermediate wrong UI frame.
- [ ] `eslint-plugin-react-hooks` is active and shows no warnings in your hooks.

**Stretch.** Try `useEffectEvent` (stable in React 19.2) in a small example where an effect reads the latest value without re-subscribing. Read why it must not be put in dependency arrays.

**Common mistakes / observe in DevTools**
- Fetching in an effect without cleanup, so the result of an old request overwrites a newer one (4.3).
- Effect that sets state derived from props/state (use derived data).
- Missing dependency "to stop the loop" (it hides a bug; fix the cause).
- Object/array/function created in render passed as dependency (new reference every render, infinite loop).
- **React DevTools:** Components tab, enable "Highlight updates when components render" in settings, and watch which components flash on each keystroke.
- **Console:** StrictMode double logs; if something is *wrong* after the double run, cleanup is missing.

**Resources.** useEffect reference: https://react.dev/reference/react/useEffect · Synchronizing with Effects: https://react.dev/learn/synchronizing-with-effects · You Might Not Need an Effect: https://react.dev/learn/you-might-not-need-an-effect · Lifecycle of reactive effects: https://react.dev/learn/lifecycle-of-reactive-effects · Removing effect dependencies: https://react.dev/learn/removing-effect-dependencies · StrictMode: https://react.dev/reference/react/StrictMode · useEffectEvent: https://react.dev/reference/react/useEffectEvent

### 4.2 Fetching data in an effect: loading, error, success

**Concept.** The canonical hand-written fetch: three pieces of state (or one `AsyncState<T>`), an effect that starts the request, sets `loading`, then `success` or `error`. The dependency array holds the request's inputs (page, filters).

**Why it matters in ShopSphere.** This is the first live screen: the real product list from `GET /products`. It is also the template you will repeat (badly, tediously) before appreciating TanStack Query.

**Library/API.** `useEffect`, `useState<AsyncState<Paginated<Product>>>`, your `request<T>` from Stage 2, `ProductCardSkeleton`.

**Hands-on task.** Create `features/catalog/hooks/useProducts.ts` (the hand-rolled version, to be deleted in Stage 9):

```ts
// shape only; you write the body
export function useProducts(params: ProductQuery): AsyncState<Paginated<Product>>
```

Use it in `/products`. Add pagination controls (page param in `useState` for now; moves to the URL in Stage 5). Render skeletons while loading, an `ErrorState` with a **Retry** button on failure (how do you re-trigger an effect? think about a `reloadKey` in state), and an `EmptyState` for zero results.

**Acceptance criteria**
- [ ] First paint shows skeletons, then results; error state appears when you stop the backend; Retry recovers after restart.
- [ ] Changing page shows loading again (you will notice the flash and think about how to avoid it; write the idea down, it's `keepPreviousData` later).
- [ ] No `any`; return type is the discriminated union.
- [ ] Network tab shows exactly one request per page change in production mode (`npm run build` + static preview), two in dev (StrictMode). You can say why.

**Stretch.** Add `lastUpdated` and a "Refresh" button; show "updated 12s ago" using a ticking `useNow()` hook (preview of 4.6).

**Common mistakes / observe in DevTools**
- Forgetting `catch` / not checking `response.ok` so errors render as empty lists.
- Setting state after unmount (React 18+ no longer warns; the bug is *stale* data, not the warning).
- `useEffect(async () => ...)`: effects cannot return a promise. Define an inner async function.
- **Network tab:** use "Preserve log", throttle to Slow 3G, change pages quickly and watch requests complete out of order. That sets up 4.3.

**Resources.** Fetching data (with the race-condition caveat): https://react.dev/learn/you-might-not-need-an-effect#fetching-data · MDN Fetch: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch · Your guide's React course (SuperSimpleDev, API fetching chapter): https://www.youtube.com/watch?v=TtPXvEcE11E

### 4.3 Cleanup, AbortController and race conditions: the debounced search box

**Concept.** If two requests are in flight and the *older* one responds *last*, the UI shows stale results (a **race condition**). Fix by **cancelling** the previous request in the effect's cleanup (`AbortController`) or by an `ignore` flag. Debouncing reduces how many requests start; cancellation guarantees only the latest result wins. They solve different problems; you need both.

**Why it matters in ShopSphere.** The header search box is used constantly. Typing "iphone" should send one request (or a few), never show results for "iph" after "iphone", and never spam the API.

**Library/API.** `AbortController`/`AbortSignal`, `fetch(url, { signal })`, `error.name === "AbortError"`, effect cleanup, `useDebounce` (4.4), `request<T>(path, { signal })` support.

**Hands-on task.** Build the **debounced search** end to end:
1. Add `signal` support to `request<T>`.
2. First write the naive version: `useEffect(() => { fetch(...query...).then(setResults) }, [query])` with **no** cleanup. Then, in DevTools, throttle to Slow 3G and type "phone" then quickly "phones". Reproduce a wrong-results state (you may need to add an artificial delay on a specific query param or use DevTools request blocking). Take a screenshot or note.
3. Fix with `AbortController` in cleanup; ignore `AbortError` in the catch.
4. Add debounce (300 ms) using the `useDebounce` hook from 4.4.
5. Build `SearchBox` (in `features/search/`): input, suggestions dropdown listing the top 5 product titles, loading indicator, "No results for 'xyz'", clears with Escape, arrow keys move the highlight, Enter navigates to `/products?search=...` (route target comes in Stage 5; log it for now).

**Acceptance criteria**
- [ ] Typing "iphone 15" quickly sends at most 2 non-cancelled requests (Network tab shows earlier ones as `(canceled)`).
- [ ] The final displayed results always correspond to the final input, even under throttled network and random request order.
- [ ] Empty/whitespace query sends nothing and closes the dropdown.
- [ ] Escape closes; clicking outside closes; arrow/Enter work; the input has `role="combobox"` with `aria-expanded`/`aria-controls` (full a11y audit in Stage 12).
- [ ] You can explain, using your own diagram, why `AbortError` is not an error to show the user.

**Stretch (recommended).** Instead of `AbortController`, implement the `let ignore = false` pattern; explain the difference (the request still completes on the network; wasteful, but it works for non-fetch async). Then add a tiny client cache `Map<string, Product[]>` for repeated queries and note you are re-inventing Query.

**Common mistakes / observe in DevTools**
- Debouncing the *request function* inside the component (re-created each render; the debounce never accumulates) instead of debouncing the *value*.
- Treating `AbortError` as a failure and flashing an error message.
- Not resetting `loading` when the effect is cancelled.
- **Network tab:** look for `(canceled)` status and "Initiator" column; **Performance** tab: record while typing and see that no long tasks block typing.

**Resources.** AbortController: https://developer.mozilla.org/en-US/docs/Web/API/AbortController · AbortSignal: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal · React: fetching and race conditions: https://react.dev/learn/you-might-not-need-an-effect#fetching-data · Cleanup in effects: https://react.dev/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development · WAI-ARIA combobox pattern: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/

### 4.4 Custom hooks and the Rules of Hooks: `useDebounce`

**Concept.** A custom hook is a function starting with `use` that calls other hooks to share *stateful logic* (not state itself: each caller gets its own). Rules: call hooks only at the top level of components/hooks, never in conditions/loops/callbacks, and only from React functions. They exist because React tracks hooks by call order.

**Why it matters in ShopSphere.** `useDebounce`, `useLocalStorage`, `useMediaQuery`, `useCountdown`, `useOnClickOutside` are used across the app; naming and shape matter.

**Library/API.** `useState`, `useEffect`, `setTimeout/clearTimeout`, the Rules of Hooks, `eslint-plugin-react-hooks` `rules-of-hooks`.

**Hands-on task.** Implement `hooks/useDebounce.ts`: `useDebounce<T>(value: T, delayMs: number): T`. Write it, then deliberately break the Rules (call a hook inside an `if`) to see the error and understand why. Also implement `useDebouncedCallback` and decide which one the search box actually needs.

**Acceptance criteria**
- [ ] Debounce returns the latest value only after the user stops typing for the delay; cleanup clears the timer on change and unmount.
- [ ] Generic, typed, no `any`.
- [ ] Two components using `useDebounce` have independent state (you can explain why).

**Stretch.** Add `leading` option (fire immediately on first change); note use cases.

**Resources.** Reusing logic with custom hooks: https://react.dev/learn/reusing-logic-with-custom-hooks · Rules of Hooks: https://react.dev/reference/rules/rules-of-hooks · Built-in hooks index: https://react.dev/reference/react/hooks

### 4.5 `useRef`: DOM access and mutable boxes

**Concept.** A ref is a mutable box that persists across renders and does **not** trigger re-render when changed. Use for DOM nodes (focus, measure, scroll) and for non-visual values (timer ids, previous values, "is first render").

**Why it matters in ShopSphere.** Focus the search input on `/`, focus the first invalid field on submit, scroll the active thumbnail into view, keep an interval id, and track the previous price to animate price changes.

**Library/API.** `useRef<T>(initial)`, `ref` as a prop (React 19: function components receive `ref` like any prop, no `forwardRef` needed), callback refs, `element.focus()`, `scrollIntoView`.

**Hands-on task.** (1) Press `/` anywhere (not inside inputs) to focus the header search; the listener must be installed/removed in an effect. (2) `usePrevious(value)`. (3) On the PDP, a `Gallery` that scrolls the selected thumbnail into view smoothly. (4) Autofocus the first input when the address dialog opens.

**Acceptance criteria**
- [ ] `/` focuses search but typing "/" in an input does not steal focus.
- [ ] Listener is removed on unmount (verify via DevTools Elements > Event Listeners or a counter).
- [ ] No state is used where a ref suffices; no ref is read during render for UI output.

**Stretch.** Merge two refs (a `useMergedRef` helper) for components needing both internal and forwarded refs.

**Resources.** Referencing values with refs: https://react.dev/learn/referencing-values-with-refs · Manipulating the DOM with refs: https://react.dev/learn/manipulating-the-dom-with-refs · useRef: https://react.dev/reference/react/useRef

### 4.6 Timers and `useCountdown`: the flash-sale strip

**Concept.** `setInterval` is an external system: start in the effect, stop in cleanup. Do not subtract 1 each tick (timers drift, throttle in background tabs). Store the **target timestamp** and compute remaining time from `Date.now()` on each tick. For real deals, the client clock cannot be trusted: apply a **server-time offset** (server time minus local time measured once).

**Why it matters in ShopSphere.** Flash sales ("Ends in 02:14:09") must be accurate, must stop at zero, must flip UI to "Deal ended", and must not leak intervals as users navigate.

**Library/API.** `setInterval/clearInterval`, `Date.now()`, `document.visibilitychange`, `Intl.DateTimeFormat`/manual padding, `useRef`, `useEffect` cleanup.

**Hands-on task.** Implement `hooks/useCountdown.ts`:

```ts
useCountdown(endsAt: number | string | Date, opts?: { serverOffsetMs?: number; tickMs?: number }):
  { remainingMs: number; days: number; hours: number; minutes: number; seconds: number; isExpired: boolean }
```

Then build `FlashSaleStrip` on the home page: 4 deal cards from the products fixture/API with a fake `endsAt = now + 90 minutes`, a countdown, a "claimed" progress bar (fake), and an expired state. Add a `useServerTimeOffset()` stub that returns 0 now; it will fetch from B4's time endpoint in Stage 11.

**Acceptance criteria**
- [ ] After a 3-minute background-tab pause, the displayed time is still correct on return (no drift).
- [ ] At zero: interval is cleared, `isExpired` is true, cards show "Deal ended", and no further renders happen (verify using the Profiler).
- [ ] Unmounting (navigating away) leaves no running interval (count `setInterval` calls with a wrapper in dev or use the Performance monitor).
- [ ] Five countdowns on a page share a single ticking source (stretch below) or you can explain the cost of five intervals.

**Stretch (recommended).** A shared `useNow(tickMs)` built on a module-level subscription with `useSyncExternalStore` so five countdowns share one timer.

**Common mistakes / observe in DevTools**
- `setInterval` created in render (not in an effect), producing hundreds of timers.
- Missing cleanup so a ghost interval keeps updating an unmounted component.
- Decrementing state in the callback with a stale closure (`setSeconds(seconds - 1)`): use computed time instead.
- **Chrome DevTools > Performance monitor** shows JS event listeners and heap; **React Profiler** shows how many commits a tick causes (a countdown should re-render only itself).

**Resources.** `setInterval`: https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval · Page Visibility API: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API · useSyncExternalStore: https://react.dev/reference/react/useSyncExternalStore · React docs "You Might Not Need an Effect" (subscribing to external stores): https://react.dev/learn/you-might-not-need-an-effect#subscribing-to-an-external-store

### 4.7 Browser-API hooks: `useLocalStorage`, `useMediaQuery`, `useOnClickOutside`

**Concept.** Browser APIs are external systems with change events. Wrap each in a small hook with a clean typed interface. `localStorage` stores strings only (serialize with JSON, handle quota/parse errors, and the SSR case where `window` does not exist). Listen to `storage` events to sync across tabs.

**Why it matters in ShopSphere.** Guest recently-viewed list, guest wishlist, theme and recent searches in `localStorage`; the mega-menu vs mobile drawer switch needs `matchMedia`; menus and popovers close on outside click.

**Library/API.** `window.localStorage`, `storage` event, `window.matchMedia`, `MediaQueryList` change events, `document` `mousedown/keydown` listeners, `useSyncExternalStore` (good fit for `matchMedia`).

**Hands-on task.**
1. `useLocalStorage<T>(key, initial)` returns `[value, setValue, remove]`; JSON-safe; tolerates corrupted JSON and storage errors; syncs across tabs.
2. `useMediaQuery(query)` returns boolean; use it to render `MegaMenu` on `(min-width: 1024px)` and a `Sheet` drawer otherwise, **without** rendering both.
3. `useOnClickOutside(ref, handler)`; use for the search dropdown.
4. **Recently viewed (guest):** on PDP mount, push the product id to a capped (max 12), de-duplicated, most-recent-first list in `localStorage`; render a `RecentlyViewedRail` on home. (Server merge arrives in Stage 11.)

**Acceptance criteria**
- [ ] Opening the shop in two tabs, viewing a product in one updates the rail in the other without reload.
- [ ] Corrupt the stored JSON in DevTools > Application: app recovers, does not crash.
- [ ] Resizing across 1024px switches menu type live; only one is in the DOM at a time.
- [ ] Hook signatures are typed and generic where useful.

**Stretch.** Version the stored value (`{ v: 1, items }`) and migrate old formats.

**Resources.** MDN Web Storage: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API · `matchMedia`: https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia · StorageEvent: https://developer.mozilla.org/en-US/docs/Web/API/StorageEvent · useSyncExternalStore: https://react.dev/reference/react/useSyncExternalStore

### 4.8 `useMemo`, `useCallback`, `memo`: measure first

**Concept.** `useMemo` caches a computed value between renders; `useCallback` caches a function identity; `React.memo` skips re-rendering a child if its props are shallow-equal. They help only when (a) the computation is genuinely expensive or (b) referential stability matters (dependency arrays, memoized children). The **React Compiler** can auto-memoize; learn the manual tools so you can read existing code and diagnose.

**Why it matters in ShopSphere.** Filtering 1,000 products on every keystroke is fine; rendering 1,000 cards because the parent re-rendered is not. Knowing the difference is the skill.

**Library/API.** `useMemo`, `useCallback`, `memo`, React DevTools Profiler, `console.time`.

**Hands-on task.** On the scratch explorer with 1,000 duplicated products: (1) record a Profiler session while typing in a filter input; (2) make `ProductCard` `memo`-ized and verify it does not help until the callback props (`onAddToCart`) are stable via `useCallback`; (3) wrap `priceHistogram` in `useMemo` and measure with `console.time` before/after; (4) write down one case where memoization changes nothing and one where it is essential.

**Acceptance criteria**
- [ ] Profiler screenshots/notes: render counts per component before and after each change.
- [ ] You can show `useMemo` that costs more than it saves (a trivial computation).
- [ ] You can explain why `memo` with an inline `onClick={() => ...}` prop is useless.

**Stretch.** Read the React Compiler docs; enable `babel-plugin-react-compiler` in a branch and compare Profiler output without your manual memoization. (A Stage 13 topic; this is a preview.)

**Common mistakes / observe in DevTools**
- Wrapping everything in `useMemo`/`useCallback` "just in case" (noise and bugs).
- Wrong dependency lists producing stale cached values.
- Profiler flamegraph colors: grey = did not render; pay attention to *why did this render* (enable "Record why each component rendered" in Profiler settings).

**Resources.** useMemo: https://react.dev/reference/react/useMemo · useCallback: https://react.dev/reference/react/useCallback · memo: https://react.dev/reference/react/memo · React Compiler: https://react.dev/learn/react-compiler · React Profiler: https://react.dev/reference/react/Profiler

### 4.9 Stale closures and functional updates

**Concept.** Each render captures its own props/state; callbacks and effects created in that render "see" those values forever. State updates based on the previous value should use the functional form (`setCount(c => c + 1)`). Intervals and event listeners are where stale closures hurt.

**Why it matters in ShopSphere.** Quantity steppers pressed rapidly, counters, optimistic updates and WebSocket handlers all read previous values.

**Library/API.** `setState(prev => next)`, refs for "latest value", `useEffectEvent`.

**Hands-on task.** Reproduce: a stepper whose "+" increments by `setQty(qty + 1)` three times in one handler (ends at +1), and an interval that logs `qty` always as the initial value. Fix with functional updates and with a ref/`useEffectEvent`. Add these as annotated examples in your notes.

**Acceptance criteria**
- [ ] Both bugs reproduced, then fixed, explained in your own words.
- [ ] You can state when to use the dependency array, a functional update, or a ref to solve each.

**Stretch.** `useLatest(value)` hook returning a ref always holding the latest value.

**Resources.** State as a snapshot: https://react.dev/learn/state-as-a-snapshot · Queueing a series of state updates: https://react.dev/learn/queueing-a-series-of-state-updates · useEffectEvent: https://react.dev/reference/react/useEffectEvent

### 4.10 Bug-hunt: five broken effects

**Concept.** You learn effects by diagnosing them.

**Hands-on task.** In `app/scratch/bugs/`, create five components, each with one bug, then fix them (use a fresh branch per bug, or one branch with five commits):
1. Infinite fetch loop (object in dependency array).
2. Missing cleanup on `resize` listener (listener count grows when navigating).
3. Race condition on a slow category switch.
4. Stale closure in an interval.
5. `useEffect` used to derive state, causing a one-frame flash of wrong UI.

Ask AI to generate *additional* broken snippets of this kind only after you finish these (see prompts in [section 7](#7-ai-assisted-development-prompts-per-stage)).

**Acceptance criteria**
- [ ] Each commit message states the symptom, the cause, and the fix.
- [ ] You can reproduce each symptom *before* fixing it (screenshot or console output).

**Stretch.** Write a one-page "Effect decision tree": do I need an effect? Which of the four categories (sync with external system, subscribe, fetch, none)?

**Resources.** React Learn, Escape Hatches: https://react.dev/learn/escape-hatches

### Checkpoint: explain it without notes (Stage 4)
1. What does it mean that an effect "synchronizes with an external system"? Give three ShopSphere examples and one non-example.
2. Why does an effect run twice in dev, and what bug does that expose?
3. Draw the timeline of two overlapping search requests with and without `AbortController`.
4. Why debounce a value instead of a function, and why do you need both debounce and cancellation?
5. How does `useCountdown` avoid drift, and what changes when the server time differs from the client's?
6. When is `useMemo` useless, and when is `memo` useless?
7. What are the Rules of Hooks and why do they exist?

**Tag:** `git tag stage-04-done`.

---

## Stage 5: Routing and project organization

| | |
| --- | --- |
| **Guide stage** | 4 React Application Development: Routing and Project Organization |
| **Needs** | **B1** (categories tree, brands, facets). Ask Claude for B1 at the start of this stage |
| **Time** | 1.5 weeks |
| **Branch prefix** | `s05/` |
| **Pages** | the full route tree (see [2.2](#22-route-map)), shell/account/checkout layouts, category and listing pages, 404 |

### 5.1 Router modes and the route config

**Concept.** React Router has three **modes** that layer on each other: **declarative** (`<BrowserRouter>` + `<Routes>`/`<Route>`), **data** (`createBrowserRouter` + loaders/actions), and **framework** (a Vite plugin that adds config-based routes in `routes.ts`, generated types, code splitting, optional SSR). Your scaffold is **framework mode with `ssr: false`** (SPA). The hooks and components (`Link`, `Outlet`, `useParams`...) are the same in all three, so skills transfer. Routes are declared in `app/routes.ts`:

```ts
import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes"

export default [
  layout("routes/shell.tsx", [          // header + footer + <Outlet/>
    index("routes/home.tsx"),
    route("products", "routes/products.tsx"),
    route("c/:categorySlug", "routes/category.tsx"),
    route("p/:productSlug", "routes/product-detail.tsx"),
    route("cart", "routes/cart.tsx"),
    // ...
    route("*", "routes/not-found.tsx"),
  ]),
] satisfies RouteConfig
```

`layout(file, children)` adds a wrapper without adding a URL segment; `route(path, file, children?)` adds a segment; `prefix("account", [...])` adds a path prefix to children without a route module; `index(file)` is the default child.

**Why it matters in ShopSphere.** The route tree *is* the app's skeleton: guards, layouts, error boundaries and (later) code splitting all hang off it.

**Library/API.** `@react-router/dev/routes` (`index`, `layout`, `route`, `prefix`), `Route.ComponentProps` generated types, `react-router` runtime components.

**Hands-on task.** Write the full route config from the [route map](#22-route-map) with placeholder pages (just a heading each). Three layouts: `shell` (header/footer), `account` (sidebar + `Outlet`), `checkout` (stepper + `Outlet`). Paste the router's three modes into your notes in your own words and say which APIs differ.

**Acceptance criteria**
- [ ] Every row of the route map renders a placeholder; unknown URLs hit the splat route.
- [ ] `npm run typecheck` regenerates route types with no errors.
- [ ] You can explain the difference between `layout` (no URL) and `route` with children (adds URL).

**Stretch.** Read how `createBrowserRouter` declares the same tree, to be able to read older RR tutorials.

**Resources.** RR modes: https://reactrouter.com/start/modes · Framework routing: https://reactrouter.com/start/framework/routing · Route module: https://reactrouter.com/start/framework/route-module · Declarative installation: https://reactrouter.com/start/declarative/installation · Your guide's full React course (routing chapter): https://www.youtube.com/watch?v=TtPXvEcE11E

### 5.2 Nested layouts and `<Outlet>`

**Concept.** A parent route renders `<Outlet />` where its matched child appears. Layout state (header cart badge, open menus) persists while children change.

**Why it matters in ShopSphere.** Header/footer persist across every page; checkout steps share a progress bar and summary; account pages share a sidebar.

**Library/API.** `Outlet`, `NavLink` (active styling via `className` function / `aria-current`), `Link`, `useLocation`.

**Hands-on task.** Build `shell.tsx` with a real header (logo, `SearchBox`, links, account menu placeholder, cart badge showing a hard-coded 0, theme toggle placeholder) and footer. Build `account/layout.tsx` with sidebar `NavLink`s; `checkout/layout.tsx` with a step indicator derived from the current URL.

**Acceptance criteria**
- [ ] Navigating between account sub-pages does not remount the sidebar (verify state persists, e.g., a counter).
- [ ] Active link styling and `aria-current="page"` are correct, including for nested paths.
- [ ] Skip-link and landmarks from Stage 3 are in the shell.

**Stretch.** Layout-level `ErrorBoundary` so one page's crash keeps the header usable (5.7).

**Resources.** Outlet: https://reactrouter.com/api/components/Outlet · NavLink: https://reactrouter.com/api/components/NavLink · Link: https://reactrouter.com/api/components/Link

### 5.3 Route params and typed navigation

**Concept.** `:productSlug` in a path becomes `params.productSlug`. In framework mode the route gets typed props: `({ params }: Route.ComponentProps)`. Slugs are strings and may not exist: handle not-found.

**Why it matters in ShopSphere.** `/p/:productSlug` and `/c/:categorySlug` are SEO-friendly, shareable and bookmarkable.

**Library/API.** `useParams`, `Route.ComponentProps`, `Link to={...}`, `generatePath` (build URLs safely), a `paths.ts` module with typed link builders.

**Hands-on task.** Wire `ProductCard` titles to `/p/:slug`. Create `lib/paths.ts` exporting `paths.product(slug)`, `paths.category(slug)`, `paths.order(id)` and use them everywhere (no string templates scattered). On the PDP, read `params.productSlug`, find the product in the fixture or call `GET /products/:slug` with your hand-rolled hook, and render a proper "Product not found" state.

**Acceptance criteria**
- [ ] Opening `/p/does-not-exist` shows a friendly not-found message with a link home (with 404 status semantics in 5.7).
- [ ] Product → related product navigation resets PDP state (Stage 3.5 key).
- [ ] No hard-coded URLs in components.

**Stretch.** Encode/decode special characters in slugs and verify with `%20`-containing input.

**Resources.** Route params: https://reactrouter.com/start/framework/routing#dynamic-segments · useParams: https://reactrouter.com/api/hooks/useParams · generatePath: https://reactrouter.com/api/utils/generatePath

### 5.4 URL as state: search params for filters, sort and pagination

**Concept.** Anything a user might **share, bookmark, refresh or navigate back to** belongs in the URL: search term, filters, sort, page, selected variant, active tab. `useSearchParams` gives `URLSearchParams` and a setter. The URL is a serialized, public state store; parse it defensively (users can type anything).

**Why it matters in ShopSphere.** `/products?category=phones&brand=apple&brand=samsung&minPrice=10000&maxPrice=50000&rating=4&sort=price_asc&page=2` must reproduce the exact same listing for anyone, and Back must undo a filter.

**Library/API.** `useSearchParams`, `URLSearchParams` (`getAll`, `append`, `delete`, `set`), Zod parsing (`z.coerce`, `.catch()`/`.default()`), `navigate(..., { replace })`, `setSearchParams(prev => ..., { replace: true })`.

**Hands-on task.**
1. `features/catalog/filters.ts`: `parseFilters(searchParams): ProductFilters` using a Zod schema with defaults and safe fallbacks (invalid `page=abc` becomes `1`, unknown sort becomes `relevance`), and `toSearchParams(filters)` omitting defaults so URLs stay clean.
2. `useProductFilters()` hook returning `{ filters, setFilter, toggleBrand, setPriceRange, clearAll, activeCount }`.
3. Build the real `/products` UI: `FilterSidebar` (category tree from `GET /categories`, brand checkboxes with counts from facets, price range with the Stage 1 histogram + two number inputs, rating radios, in-stock toggle), `SortSelect`, `ActiveFilterChips` with remove buttons, `Pagination`. On mobile, filters open in a `Sheet`.
4. Wire `useProducts` (the hand-rolled hook) to `filters`. Typing in the price inputs should debounce before touching the URL.
5. Use `replace: true` for transient changes (typing, slider drag) and push for discrete ones (checkbox, sort) so Back is meaningful.
6. `/c/:categorySlug` reuses the same page with a preset category.

**Acceptance criteria**
- [ ] Refreshing the page or sharing the URL restores the exact same listing and controls.
- [ ] Back/Forward move through filter changes sensibly; dragging a slider does not create 40 history entries.
- [ ] Garbage in the URL (`?page=-5&sort=banana&minPrice=abc`) never crashes the page.
- [ ] Changing any filter resets `page` to 1; changing page keeps filters.
- [ ] Facet counts come from the API (B1); you can explain which counts are "disjunctive".
- [ ] At 360px the filter sheet opens, applies and closes, focus returns correctly.

**Stretch (recommended).** Store `view=grid|list` and `sort` preference in `localStorage` as default when the URL has none.

**Common mistakes / observe in DevTools**
- Duplicating URL values into `useState` (two sources of truth that desync). Derive from the URL.
- Not resetting `page` when filters change.
- Using `push` for every keystroke, polluting history.
- **Network tab:** one request per committed URL change (not per keystroke).

**Resources.** useSearchParams: https://reactrouter.com/api/hooks/useSearchParams · MDN URLSearchParams: https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams · Zod `.catch`/`.default`: https://zod.dev/api · TkDodo "Search params are state": https://tkdodo.eu/blog/search-params-are-state

### 5.5 Navigation, redirects, scroll and focus

**Concept.** `<Link>` for user navigation, `useNavigate()` for programmatic navigation after an action, `<Navigate>` for redirects in render, `state` to pass non-URL context (e.g., `from`). On route change scroll position and focus must be handled: single-page apps lose the browser's default focus reset.

**Why it matters in ShopSphere.** After login, return the user to where they were. After "Place order", replace history so Back does not return to payment. Screen-reader users must hear that the page changed.

**Library/API.** `useNavigate`, `Navigate`, `useLocation`, `ScrollRestoration` (already in `root.tsx`), `navigate(-1)`, `{ replace: true, state }`.

**Hands-on task.** (1) Login stub navigates to `location.state?.from ?? "/"`. (2) After a fake order, `navigate(paths.orderSuccess(id), { replace: true })`. (3) On route change move focus to the page `<h1>` (a small `useRouteFocus` hook in the shell using `useLocation` + a ref) and announce the title in a polite live region. (4) Verify scroll restoration: scroll the list, open a product, hit Back.

**Acceptance criteria**
- [ ] After "login", you land on the page you originally tried to reach (works for deep links with query strings).
- [ ] Back after the fake order does not return to checkout.
- [ ] Keyboard focus lands on the new page's heading after navigation; screen reader announces it (test with VoiceOver on macOS: Cmd+F5).
- [ ] Scroll position is restored on Back and reset on new navigation.

**Stretch.** Prevent leaving the checkout form with unsaved changes (`useBlocker`).

**Resources.** useNavigate: https://reactrouter.com/api/hooks/useNavigate · ScrollRestoration: https://reactrouter.com/api/components/ScrollRestoration · useBlocker: https://reactrouter.com/api/hooks/useBlocker

### 5.6 Route guards (stubbed auth)

**Concept.** A guard is a layout route that renders `<Outlet/>` only if a condition holds; otherwise `<Navigate>`. You will use a stub `useAuth()` now and swap in real auth in Stage 10.

**Why it matters in ShopSphere.** `/checkout`, `/orders`, `/account/*` need a session; `/login` should bounce logged-in users; `/seller` needs a role.

**Library/API.** `layout()` routes, `Outlet`, `Navigate`, a minimal `AuthContext` stub with `status: "loading" | "authenticated" | "anonymous"`.

**Hands-on task.** Implement `RequireAuth`, `PublicOnly`, `RequireRole role="seller"` as layout routes in `routes.ts` wrapping the right subtrees. The stub reads a fake `user` from `localStorage` toggled by a dev panel button. Handle the `"loading"` status (do not redirect before you know; show a skeleton).

**Acceptance criteria**
- [ ] Anonymous visit to `/orders` redirects to `/login` with `state.from = "/orders"`.
- [ ] Authenticated visit to `/login` redirects away.
- [ ] Wrong role shows a 403 page, not a blank page.
- [ ] While status is `"loading"`, nothing flashes (no redirect flicker).
- [ ] You can explain why client-side guards are UX, **not security** (the API enforces).

**Stretch.** `useAuthRedirect` that preserves query strings and hash.

**Resources.** Layout routes: https://reactrouter.com/start/framework/routing#layout-routes · Navigate: https://reactrouter.com/api/components/Navigate

### 5.7 404, errors, and error boundaries

**Concept.** A route module can `export function ErrorBoundary()` to render when a render error (or a thrown `Response`) occurs in that route; use `isRouteErrorResponse(error)` to distinguish HTTP-style errors from exceptions. A splat `route("*", ...)` handles unmatched URLs. Place boundaries at multiple levels so a failure is contained.

**Why it matters in ShopSphere.** A crash on the reviews widget must not blank the PDP; a bad URL must show a branded 404 with search and category links, not a white screen.

**Library/API.** `ErrorBoundary` export, `isRouteErrorResponse`, `useRouteError` (in older style), `Route.ErrorBoundaryProps`, `root.tsx` `ErrorBoundary`.

**Hands-on task.** Add a global `ErrorBoundary` to `root.tsx`, a layout-level one in `shell.tsx`, a not-found page at `route("*")` with a search box and popular categories, and a deliberate "Throw error" dev button on one route to test. In Stage 12 you add React-level boundaries for widgets.

**Acceptance criteria**
- [ ] Unknown URL shows the branded 404; error in the account page keeps header/footer visible.
- [ ] Production-like build does not show stack traces to users; dev shows details.
- [ ] Each error screen has a way forward (retry / home / search).

**Stretch.** Log errors to `console.error` through one function in `lib/report.ts` (Sentry plugs in here in Stage 14).

**Resources.** Error boundaries (RR): https://reactrouter.com/how-to/error-boundary · Not found: https://reactrouter.com/start/framework/route-module · React error boundaries: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary

### 5.8 Page titles, meta, breadcrumbs (`meta`, `handle`, `useMatches`)

**Concept.** Route modules can export `meta` to set `<title>` and meta tags (rendered by `<Meta/>` in `root.tsx`) and `handle`, an arbitrary object other code can read through `useMatches()`; breadcrumbs are a common use.

**Why it matters in ShopSphere.** Tab titles, shareable links and (limited) SEO in SPA mode; breadcrumbs on PDP and listing improve navigation.

**Library/API.** `export function meta(args: Route.MetaArgs)`, `export const handle = { breadcrumb: ... }`, `useMatches`.

**Hands-on task.** Add `meta` for each route (`"iPhone 15 | ShopSphere"` on PDP once the product is known, which is a limit of SPA mode: the title is set client-side after data arrives; note the consequence for crawlers). Build `Breadcrumbs` from `handle`s: Home > Phones > Apple > iPhone 15.

**Acceptance criteria**
- [ ] Each page has a unique title; the title updates when the product loads.
- [ ] Breadcrumbs work on category and PDP pages using real category paths and are rendered in a `nav aria-label="Breadcrumb"` with `aria-current`.
- [ ] You can explain what SPA mode means for SEO and what Stage 14's SSR deep dive changes.

**Stretch.** `BreadcrumbList` JSON-LD in `meta`.

**Resources.** `meta` export: https://reactrouter.com/start/framework/route-module#meta · `handle`/`useMatches`: https://reactrouter.com/api/hooks/useMatches · Google breadcrumb structured data: https://developers.google.com/search/docs/appearance/structured-data/breadcrumb

### 5.9 Code splitting by route (observe)

**Concept.** In framework mode every route module is automatically its own chunk, loaded when the route is first visited. Heavy, rarely used widgets inside a route can be split further with `React.lazy` + `Suspense`.

**Why it matters in ShopSphere.** Checkout, account and review editor code should not bloat the home page's first load.

**Library/API.** Vite build output, `React.lazy`, `Suspense`, `import()`.

**Hands-on task.** Run `npm run build` and read the chunk list; open the built app, Network tab filtered to JS, and note which chunks load per route. Lazy-load the "Compare" drawer and the review editor with `lazy`.

**Acceptance criteria**
- [ ] You can name which chunk loads when you first open `/checkout`.
- [ ] Lazy components show a fallback and are absent from the initial request list.

**Stretch.** `vite-bundle-visualizer` or `rollup-plugin-visualizer`: record the largest dependency (feeds Stage 13).

**Resources.** `lazy`: https://react.dev/reference/react/lazy · Suspense: https://react.dev/reference/react/Suspense · Vite build: https://vite.dev/guide/build

### 5.10 Project organization day: from scratch folders to features

**Concept.** Organize by feature, share by promotion (move something to shared code only when a second feature needs it), keep route modules thin, keep pure logic out of components. Do not over-architect.

**Why it matters in ShopSphere.** By Stage 11 there are 100+ files; the structure in [3.2](#32-suggested-folder-structure-feature-oriented) is what keeps them navigable.

**Library/API.** Folder conventions, `index.ts` public APIs, ESLint `no-restricted-imports` (or `eslint-plugin-boundaries`).

**Hands-on task.** Refactor everything built so far into the feature structure: move scratch code into `features/catalog`, `features/search`, `features/deals`; delete the scratch routes you no longer need; add a `README` section "How the frontend is organized" (10 lines max). Add an ESLint rule forbidding imports of `features/*/*` internals from another feature (use `no-restricted-imports` patterns).

**Acceptance criteria**
- [ ] No component file > 200 lines without a good reason; no business logic inside `routes/*.tsx`.
- [ ] Lint fails if one feature deep-imports another's internals.
- [ ] A new teammate could find "where is the price formatting" in under 30 seconds.

**Stretch.** Write an ADR (`docs/adr/0001-feature-folders.md`): context, decision, consequences, 10 lines.

**Resources.** React project structure (docs deliberately minimal): https://react.dev/learn/thinking-in-react · Bulletproof React (structure reference): https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md

### Checkpoint: explain it without notes (Stage 5)
1. What are RR's three modes, and which are you in? What changes if `ssr` were `true`?
2. What belongs in the URL vs in `useState`? Give three examples each from ShopSphere.
3. Why is a client-side guard not a security boundary?
4. How do you make Back behave well when a slider changes the URL 40 times?
5. How does the error boundary hierarchy keep a failed review widget from blanking the PDP?
6. Why does `ScrollRestoration` matter, and what a11y problem does client routing introduce?

**Tag:** `git tag stage-05-done`.

---

## Stage 6: API and data integration (by hand)

| | |
| --- | --- |
| **Guide stage** | 5 API and Data Integration (HTTP, fetching and CRUD, loading/error/empty states) |
| **Needs** | **B0** (products, auth endpoints) and **B2** (wishlist and addresses). Ask Claude for B2 at the start of this stage |
| **Time** | 1.5 weeks |
| **Branch prefix** | `s06/` |
| **Pages** | `/account/addresses` (CRUD), wishlist toggle, `/products` infinite scroll variant, shared async-state components |

You still do everything by hand (fetch wrapper + effects). Treat this stage as **building the pain journal** for Stage 9: every time you write boilerplate, duplicate a request, or hit stale data, add a line in `docs/pain-journal.md`. In Stage 9 you will tick each line off.

### 6.1 HTTP in depth: reading an API like an engineer

**Concept.** A request is method + URL (path, query) + headers + optional body; a response is status + headers + body. Methods express intent: `GET` (read, cacheable, idempotent), `POST` (create/command), `PUT` (replace), `PATCH` (partial update), `DELETE`. Status families: 2xx success, 3xx redirect/cache, 4xx client error (400 bad input, 401 unauthenticated, 403 forbidden, 404 missing, 409 conflict, 422 validation, 429 rate-limited), 5xx server error. Headers carry content type, auth (`Authorization`), cookies, caching (`ETag`, `Cache-Control`), CORS.

**Why it matters in ShopSphere.** Your UI behaviour is a function of status codes: 401 triggers refresh, 409 shows "item went out of stock", 429 shows a back-off message, 422 maps to field errors.

**Library/API.** DevTools Network, `curl -i`, Swagger UI, Bruno/Postman. MDN HTTP docs.

**Hands-on task.** Create `docs/api-notes.md` with a table of every endpoint currently available (method, path, auth required?, query/body, success shape, error codes seen). Reproduce each error class with `curl` (401 by omitting the token, 403 by a customer hitting an admin route if available, 404, 422/400 by an invalid body, 429 by hammering login). Record the exact error envelope for each.

**Acceptance criteria**
- [ ] Table covers all B0 and B2 endpoints and was verified with real requests (not copied from Swagger blindly).
- [ ] You can explain idempotency and why `DELETE /wishlist/:id` called twice should be safe.
- [ ] You know where in the response the pagination `meta` is and how `totalPages` relates to `limit`.

**Stretch.** Check conditional requests: call `GET /products/:slug` twice with `If-None-Match` if the server sends an `ETag`; explain what a 304 buys.

**Resources.** MDN HTTP overview: https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview · HTTP methods: https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods · HTTP status: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status · HTTP caching: https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching · Cookies: https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies

### 6.2 The API client layer

**Concept.** One module owns "how we talk to the server" so components never see URLs, headers, envelopes or tokens. It sets the base URL, JSON headers, `credentials: "include"`, parses the envelope, converts failures into a single `ApiError`, supports `AbortSignal`, and exposes hooks for auth (attach `Authorization`, handle 401).

**Why it matters in ShopSphere.** ~60 endpoints by the end. A consistent client means one place to add logging, retry, auth refresh (Stage 10) and Sentry breadcrumbs (Stage 14).

**Library/API.** `fetch`, `Headers`, `URLSearchParams`, `AbortSignal.timeout(ms)` / `AbortSignal.any([...])`, custom `ApiError extends Error` with `status`, `code`, `details`, `isNetwork`, `isAbort`. Optional: axios or ky.

**Hands-on task.** Build `lib/api/client.ts`:

```ts
export class ApiError extends Error { status: number; code: string; details?: unknown; /* ... */ }
export async function api<T>(path: string, opts?: {
  method?: "GET"|"POST"|"PUT"|"PATCH"|"DELETE"; query?: Record<string, unknown>;
  body?: unknown; signal?: AbortSignal; schema?: z.ZodType<T>; auth?: boolean }): Promise<T>
```

Requirements: skips `undefined` query values and serializes arrays as repeated keys; JSON bodies; `FormData` bodies untouched; envelope unwrap; non-JSON error responses handled (proxy HTML 502); network failure becomes `ApiError{ code: "NETWORK_ERROR" }`; 10-second timeout combined with the caller's signal; a `configureApi({ getAccessToken, onUnauthorized })` hook for Stage 10. Then create per-feature API files: `features/catalog/api.ts` (`getProducts`, `getProduct`), `features/wishlist/api.ts`, `features/account/addresses.api.ts`. Replace direct `fetch` usage everywhere.

**Acceptance criteria**
- [ ] No component or hook calls `fetch` directly (search proves it).
- [ ] Killing the backend yields `ApiError` with `code: "NETWORK_ERROR"` and a user-friendly message.
- [ ] Aborting yields a distinguishable abort (not an error toast).
- [ ] `ApiError.status === 422` exposes field details for form mapping (Stage 7).
- [ ] A unit-level sanity script exercises success, 4xx envelope, non-JSON 502 (use a tiny local `node:http` server or defer to MSW in Stage 12).

**Stretch.** Re-implement the same surface with `axios` (instance, interceptors) or `ky` (hooks) in a branch, then compare: bundle size (`npm run build`), ergonomics, interception model. Decide and record in an ADR. Fetch is recommended: no dependency, and Query needs only a function that returns a promise.

**Resources.** MDN Fetch: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API · `AbortSignal.timeout`: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static · axios: https://axios-http.com/docs/intro · ky: https://github.com/sindresorhus/ky

### 6.3 CRUD by hand: the address book (B2)

**Concept.** A CRUD flow is: list (read), create, update, delete, plus UI states between each action (idle, pending, success, error). By hand, you must manage: refetch/patch local state after each mutation, per-row pending flags, error display, and disabling actions to prevent double submits.

**Why it matters in ShopSphere.** Addresses feed checkout. The same pattern powers wishlist, orders cancellation, reviews and admin tables.

**Library/API.** Your `api<T>()`, `useState`/`useReducer`, shadcn `dialog`, `alert-dialog`, `sonner` (toast), `fetch` verbs `POST/PATCH/DELETE`.

**Hands-on task.** Build `/account/addresses` (inside the `account` layout, behind the stub guard):
1. List addresses (card per address, "Default" badge).
2. "Add address" opens a dialog with a plain controlled form (RHF arrives in Stage 7; keep this one deliberately plain to feel the difference).
3. Edit, delete (with confirm `alert-dialog`), set-as-default.
4. Do it with a `useAddresses()` hook that exposes `{ state, create, update, remove, setDefault, reload }`.
5. Real login is not built yet: log in via the Stage 7 stub flow or paste a token from `curl` into a dev-only field that your `getAccessToken` reads. (This is temporary; Stage 10 replaces it.)

**Acceptance criteria**
- [ ] All four operations work against the real API and survive a page refresh.
- [ ] While an operation is pending, its button is disabled and shows a spinner; other rows remain usable.
- [ ] Errors (e.g. invalid pincode from the server) show inline, not only in the console.
- [ ] Deleting the default address behaves per backend rule (read the Swagger doc: auto-promote or error) and your UI reflects it.
- [ ] After create/update/delete you made a conscious choice: refetch the list or patch local state; write down trade-offs.

**Stretch.** Optimistic delete with rollback on failure (you will find it surprisingly fiddly by hand; note why).

**Common mistakes / observe in DevTools**
- Double POST on double-click (no pending guard).
- Local list updated before the server confirms, then silently out of sync on failure.
- **Network tab:** each action should be one request plus (maybe) one refetch; verify with the "Fetch/XHR" filter.

**Resources.** MDN Using Fetch (POST/PATCH): https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch · React updating arrays in state: https://react.dev/learn/updating-arrays-in-state · shadcn alert dialog: https://ui.shadcn.com/docs/components/alert-dialog

### 6.4 Wishlist toggle (B2): the shared-state problem

**Concept.** The same entity is shown in many places (heart on card, heart on PDP, wishlist count in header). If each instance fetches or holds its own copy, they disagree. By hand you need a shared source plus per-item pending state.

**Why it matters in ShopSphere.** This is the moment you feel why server-state caches exist.

**Library/API.** Your API layer, a temporary `WishlistContext` (or module-level store) holding a `Set<productId>`, `useCallback`.

**Hands-on task.** Implement `useWishlist()`: loads the user's wishlist ids once; `isWishlisted(id)`, `toggle(id)` that updates immediately (optimistic), calls `POST`/`DELETE`, and **rolls back + toasts** on failure. Wire hearts on `ProductCard` and the PDP, and the header count. Build the `/wishlist` page (grid, remove, empty state).

**Acceptance criteria**
- [ ] Toggling the heart on a card updates the PDP heart and header count without refetching.
- [ ] Rapid double-toggle does not leave client and server disagreeing (decide how: queue, disable while pending, or last-write-wins; justify).
- [ ] Failure (stop the backend) rolls back and tells the user.
- [ ] Add 5+ lines to the pain journal.

**Stretch.** Cross-tab sync with the `storage`/`BroadcastChannel` API.

**Resources.** BroadcastChannel: https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel · Sharing state between components: https://react.dev/learn/sharing-state-between-components

### 6.5 Loading, error, empty and skeleton states

**Concept.** Every async view has at least five states: **initial loading**, **refreshing (stale data visible)**, **success**, **empty (success with zero results)** and **error**; plus **partial** (some rails fail). Skeletons should match the final layout to avoid layout shift. Errors need a *reason* and an *action* (retry).

**Why it matters in ShopSphere.** Production quality is mostly non-happy paths: slow mobile networks, backend restarts, no results after filtering.

**Library/API.** shadcn `skeleton`, your `AsyncState<T>`, `navigator.onLine` + `online`/`offline` events, `role="status"`/`aria-busy`, `prefers-reduced-motion`.

**Hands-on task.** Create shared components in `components/common/`: `ErrorState({ error, onRetry })` (maps `ApiError` codes to friendly copy), `EmptyState({ icon, title, description, action })`, skeleton families (`ProductGridSkeleton`, `ListSkeleton`, `DetailSkeleton`), `OfflineBanner` (uses online/offline events), and an `AsyncView` component:

```tsx
<AsyncView state={state} loading={<ProductGridSkeleton />} empty={(d) => d.items.length === 0 && <EmptyState .../>}>
  {(data) => <ProductGrid items={data.items} />}
</AsyncView>
```

Apply to products, addresses, wishlist. Add a per-section home-page layout: rails fail independently using the `Promise.allSettled` idea from Stage 1.

**Acceptance criteria**
- [ ] Each of the five states is demonstrable: throttle, offline, empty filter, 500 (stop backend), success.
- [ ] No layout shift when skeletons are replaced (check Lighthouse CLS or the Performance panel layout-shift track).
- [ ] Skeleton region has `aria-busy`; error has `role="alert"`; retry button is focusable and works.
- [ ] A failing rail on home shows an inline error while other rails render.

**Stretch.** Delay skeleton display by 150 ms to avoid flash on fast responses; a minimum display time to avoid flicker.

**Resources.** MDN online/offline: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine · Layout shift: https://web.dev/articles/cls · shadcn skeleton: https://ui.shadcn.com/docs/components/skeleton

### 6.6 Pagination vs infinite scroll, by hand

**Concept.** **Pagination** is URL-addressable, predictable, good for SEO and for jumping; **infinite scroll** keeps momentum but breaks back-button position, footer access, and screen-reader flow unless done carefully; **"Load more"** is the pragmatic hybrid. Infinite lists use an `IntersectionObserver` sentinel.

**Why it matters in ShopSphere.** Marketplaces often use infinite scroll on mobile feeds (recommendations, reviews) and pagination on search results. You will implement both and then see `useInfiniteQuery` in Stage 9.

**Library/API.** `IntersectionObserver` (in an effect with cleanup), `useRef`, your API's `page/limit/meta.totalPages`, append-and-dedupe by `_id`.

**Hands-on task.** Add a `view=more` mode to `/products` (or a separate `/explore` route): a `useInfiniteProducts(filters)` hook that appends pages, dedupes, handles end-of-list and errors on page N (keep earlier pages visible, show inline retry for the failing page), and resets when filters change (including aborting the in-flight request). Provide a visible "Load more" fallback button. Keep classic pagination on `/products` as default.

**Acceptance criteria**
- [ ] Scrolling to the end triggers exactly one next-page request at a time (no duplicates under fast scrolling).
- [ ] Changing a filter while page 3 is loading never mixes old and new results.
- [ ] Reaching the end shows "You've seen it all" and stops observing.
- [ ] Keyboard users can reach the footer (the button fallback works; the sentinel does not trap focus).

**Stretch.** Preserve scroll position on Back (store loaded pages in `sessionStorage` keyed by the URL).

**Common mistakes / observe in DevTools**
- Observer recreated each render (leak). Use cleanup.
- Request triggered twice when the sentinel stays visible after results append.
- **Performance panel:** DOM node count grows unbounded; note for Stage 13 virtualization.

**Resources.** IntersectionObserver: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API · Infinite scroll a11y concerns: https://www.nngroup.com/articles/infinite-scrolling-tips/

### 6.7 Mapping API data to view models

**Concept.** Do not scatter formatting and derived fields through components. Convert API shapes into **view models** at the boundary: `discountPercent`, `formattedPrice`, `inStock`, `badge`, human dates, image fallbacks.

**Why it matters in ShopSphere.** When the backend renames a field, you fix one mapper instead of 20 components; money and date formatting stay consistent.

**Library/API.** Pure mapper functions, `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, Zod `.transform()`.

**Hands-on task.** `features/catalog/mappers.ts`: `toProductCardVM(product)` and `toProductDetailVM(product)`; `lib/format.ts`: `formatCurrency`, `formatDate`, `formatRelative`, `formatCount` (1.2K). Use `Intl`. Place image fallback logic in one place.

**Acceptance criteria**
- [ ] Components receive view models; none computes discount or formats money inline.
- [ ] Locale/currency are parameters with defaults (needed for Stage 13 i18n).
- [ ] A product with missing image/rating renders sensibly.

**Stretch.** Do the mapping in the Zod schema via `.transform()` and compare ergonomics (input vs output types).

**Resources.** Intl: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl · RelativeTimeFormat: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat

### 6.8 Generic `useFetch` and the pain journal

**Concept.** After writing three hand-rolled fetching hooks you will notice the repeated boilerplate and its failure modes. Abstract once (`useFetch<T>(fn, deps)`) and then list *everything it still cannot do*.

**Why it matters in ShopSphere.** Stage 9 is only convincing if you know precisely what it replaces.

**Library/API.** Generic hook with `AsyncState<T>`, `reload`, abort on dependency change, optional `enabled` flag.

**Hands-on task.** Refactor `useProducts`, `useAddresses` (read part), `useWishlist` (read part) onto `useFetch<T>`. Then complete `docs/pain-journal.md` with a categorized list. Expected entries: no caching between pages, the same product fetched twice by the card and PDP, refetch on focus missing, retry logic, dedup of concurrent identical requests, mutation invalidation by hand, optimistic update rollback by hand, loading flash when paging, global loading indicator, devtools visibility, pagination merge.

**Acceptance criteria**
- [ ] `useFetch<T>` is generic, abortable, typed; three hooks use it.
- [ ] Pain journal has at least 10 distinct entries, each with the concrete ShopSphere moment that produced it.
- [ ] You can answer: "what would break if two components mount `useFetch` for the same URL?".

**Stretch.** Implement a 20-line in-memory cache with stale-while-revalidate in `useFetch`. Notice how fast the edge cases grow.

**Resources.** Practical React Query by TkDodo (preview for Stage 9): https://tkdodo.eu/blog/practical-react-query

### Checkpoint: explain it without notes (Stage 6)
1. What are the five states of an async view, and how do you test each in the browser?
2. Walk through what happens, request by request, when you click the heart twice quickly.
3. Why do we convert API data into view models?
4. What does a 409 usually mean in ShopSphere, and how should the UI react compared to a 422?
5. Pagination vs infinite scroll: three trade-offs each.
6. Name five things your hand-written fetching cannot do that you want from a library.

**Tag:** `git tag stage-06-done`.

---

## Stage 7: Forms and validation

| | |
| --- | --- |
| **Guide stage** | 5 API and Data Integration: Validation and Form Handling |
| **Needs** | **B0** (auth endpoints), **B2** (addresses). **B7** (image upload) is needed only for the upload topic's real endpoint; it is built before Stage 11, so preview-only for now |
| **Time** | 1.5 weeks |
| **Branch prefix** | `s07/` |
| **Pages** | `/login`, `/register`, address dialog/page, `/checkout/*` shell, pincode check on PDP, `/account/profile` (avatar), seller product form (basic) |

### 7.1 React Hook Form basics: register, handleSubmit, formState

**Concept.** RHF keeps form values mostly **uncontrolled** (in refs/DOM), so typing does not re-render the whole form. `register("email")` wires an input; `handleSubmit(onValid, onInvalid)` validates then calls you with typed values; `formState` exposes `errors`, `isSubmitting`, `isDirty`, `isValid`, `touchedFields`.

**Why it matters in ShopSphere.** Login, register, address, checkout, review, coupon, profile, seller product: eight forms. Hand-rolling each is where bugs live.

**Library/API.** `react-hook-form`: `useForm`, `register`, `handleSubmit`, `formState`, `reset`, `setFocus`, `mode` (`onSubmit` | `onBlur` | `onChange` | `onTouched`).

**Hands-on task.** Install `react-hook-form`. Rebuild the Stage 3 review form and the Stage 6 address dialog form with RHF **without** a resolver first, using built-in rules (`required`, `minLength`, `pattern`). Compare to your plain-controlled versions (lines of code, number of re-renders per keystroke via Profiler).

**Acceptance criteria**
- [ ] Both forms work; typing in one field does not re-render sibling fields (Profiler evidence).
- [ ] `isSubmitting` disables the submit button during the request.
- [ ] You can explain why RHF is "uncontrolled by default" and what `watch` vs `useWatch` costs.

**Stretch.** `devtool` plugin: `@hookform/devtools` to inspect form state.

**Resources.** RHF docs: https://react-hook-form.com/get-started · API: https://react-hook-form.com/docs/useform · formState: https://react-hook-form.com/docs/useform/formstate

### 7.2 Zod schemas with `zodResolver`: one source of truth

**Concept.** Put validation in a Zod schema, pass it as `resolver: zodResolver(schema)`; the form values type comes from the schema. Zod 4 with `@hookform/resolvers` v5. When a schema uses `transform`/`coerce`/`default`, the **input** (form fields) and **output** (what `handleSubmit` receives) types differ: type with `z.input` and `z.output`: `useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema) })`.

**Why it matters in ShopSphere.** The same schema style validates forms and API responses; validation messages are consistent; changing a rule changes types everywhere.

**Library/API.** `@hookform/resolvers/zod` (`zodResolver`), Zod 4: `z.object`, `z.email()`, `z.string().min(8)`, `.refine`, `.superRefine`, `z.coerce.number()`, `z.enum`, `z.literal(true)`, error customization (`{ error: "..." }`).

**Hands-on task.** Create `features/auth/schemas.ts`:

```ts
export const registerSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter your full name" }),
  email: z.email({ error: "Enter a valid email" }),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  confirmPassword: z.string(),
  acceptTerms: z.literal(true, { error: "You must accept the terms" }),
}).refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], error: "Passwords do not match" })
```

Also `loginSchema`, `addressSchema` (India: 10-digit phone starting 6-9, 6-digit pincode not starting with 0, required state from a list), `couponSchema`, `reviewSchema` (rating 1 to 5, body 20-500 chars). Build `/login` and `/register` pages with them, calling the real `POST /auth/login|register` (result handling is minimal until Stage 10: display success and the received `user`).

**Acceptance criteria**
- [ ] Validation messages show under the right fields; password mismatch error attaches to `confirmPassword`.
- [ ] Types for `onSubmit(values)` are inferred from the schema (no manual interface).
- [ ] Phone/pincode rules are tested with at least 6 valid/invalid examples each (as `console.assert`s now, Vitest in Stage 12).
- [ ] You can explain `z.input` vs `z.output` using `z.coerce.number()` as the example.

**Stretch.** Share the same field schemas for client + server by asking Claude to expose them (monorepo shared package or copy with a CI check); discuss drift.

**Resources.** Zod: https://zod.dev · @hookform/resolvers: https://github.com/react-hook-form/resolvers · RHF + Zod guide: https://react-hook-form.com/get-started#SchemaValidation · Zod error customization: https://zod.dev/error-customization

### 7.3 Server errors, submit states and accessible error messages

**Concept.** Client validation is a convenience; the server is authoritative. Map server failures to the form: field errors via `setError("email", { type: "server", message })`, form-level errors via `setError("root.server", ...)`. Accessibility: associate messages with inputs (`aria-describedby`), mark invalid (`aria-invalid`), announce (`role="alert"`), move focus to the first invalid field (`shouldFocusError` default).

**Why it matters in ShopSphere.** "Email already registered" (409) and "Invalid credentials" (401) must be shown properly; double-submits must be prevented.

**Library/API.** `setError`, `clearErrors`, `formState.errors.root`, `isSubmitting`, `isSubmitSuccessful`, `ApiError.details`.

**Hands-on task.** Build a reusable `FormField` component (label, control slot, hint, error with correct ARIA) and a `FormError` for root errors; map `ApiError` (`VALIDATION_ERROR` with `details[{path,message}]`, `EMAIL_TAKEN`, `INVALID_CREDENTIALS`) to the right UI. Make the login form not reveal whether the email exists (same message for both).

**Acceptance criteria**
- [ ] Registering an existing email shows the error under the email field and focuses it.
- [ ] Server-side validation details for multiple fields are all displayed.
- [ ] A screen reader reads the error when focusing the invalid field (test with VoiceOver).
- [ ] Network failure shows a root error with retry, the form data is preserved.
- [ ] Submit button cannot be double-clicked into two requests.

**Stretch.** Use React 19's `useActionState` + `<form action>` for the login form in a branch and compare with RHF (what do you lose?).

**Resources.** setError: https://react-hook-form.com/docs/useform/seterror · ARIA error patterns: https://www.w3.org/WAI/tutorials/forms/notifications/ · React `useActionState`: https://react.dev/reference/react/useActionState

### 7.4 Controlled widgets inside RHF: `Controller`, selects, checkboxes

**Concept.** Components that are not native inputs (shadcn/base-ui `Select`, `Checkbox`, `Switch`, custom star rating) do not expose `ref`/`onChange` in the way `register` expects. Use `Controller` (or `useController`) to bridge.

**Why it matters in ShopSphere.** State selector in the address form, "set as default" switch, delivery slot radio, star rating.

**Library/API.** `Controller`, `useController`, `control`, `field.value/onChange/onBlur`, `fieldState`.

**Hands-on task.** Build the address form fully: name, phone, line1/2, city, state `Select`, pincode, type `RadioGroup` (home/work), `isDefault` `Switch`. Use `Controller` for the non-native parts. `defaultValues` from an existing address for edit mode and `reset(newValues)` when the dialog opens for a different address.

**Acceptance criteria**
- [ ] Create and edit use the same component; edit pre-fills; reopening for a different address resets properly.
- [ ] Select and Switch values are validated by the schema like text inputs.
- [ ] Tab order is logical; each control has a visible label.

**Stretch.** Build `<FormInput>`, `<FormSelect>`, `<FormSwitch>` wrappers using `useFormContext` so the form file shrinks 50%.

**Resources.** Controller: https://react-hook-form.com/docs/usecontroller/controller · useFormContext: https://react-hook-form.com/docs/useformcontext · shadcn form patterns: https://ui.shadcn.com/docs/forms/react-hook-form

### 7.5 Dynamic fields: `useFieldArray` (seller product form)

**Concept.** `useFieldArray` manages repeating groups (add, remove, reorder) with stable ids (`field.id` as `key`).

**Why it matters in ShopSphere.** Seller product listing has variants (`sku`, color, size, price, stock) and spec rows (name/value). You learn the pattern now; the admin app does the same at scale.

**Library/API.** `useFieldArray({ control, name })` (`fields`, `append`, `remove`, `move`, `replace`), nested array errors (`errors.variants?.[i]?.price`), Zod `z.array(...).min(1)`, `.superRefine` for unique SKUs.

**Hands-on task.** `/seller/products/new` (inside the seller-guard stub): title, brand, category (select from API), description, images (upload topic), `variants[]` with add/remove, `specs[]` key/value rows. Validate: at least one variant, positive prices, MRP ≥ price, SKUs unique within the form. Submit prints the typed payload (the real endpoint arrives with B11).

**Acceptance criteria**
- [ ] Removing a middle row keeps the other rows' values and errors attached to the correct rows (use `field.id` keys).
- [ ] Duplicate SKU error is attached to the duplicate row's SKU field.
- [ ] Payload type is derived from the schema.

**Stretch.** Drag-and-drop reorder with `@dnd-kit` and `move`.

**Resources.** useFieldArray: https://react-hook-form.com/docs/usefieldarray · Zod arrays: https://zod.dev/api#arrays

### 7.6 Async validation: the pincode check (and coupons)

**Concept.** Some rules need the server (is this pincode serviceable? is this coupon valid for this cart?). Do not validate on every keystroke: validate on blur or after a debounce, cancel stale requests, and always re-validate on the server on submit. Async errors are *advisory UI*, server decides finally.

**Why it matters in ShopSphere.** PDP "Check delivery" and checkout address pincode; the coupon field in cart.

**Library/API.** RHF `validate: async`, `mode: "onBlur"`, `setError`/`clearErrors`, `useDebounce` + `AbortController` from Stage 4, `trigger("pincode")`.

**Hands-on task.**
1. PDP **delivery check** component: 6-digit input; on valid format, debounced request to a delivery-check endpoint (until a real endpoint exists use a deterministic local stub: pincodes starting `4` deliver in 2 days; `5` in 4; `0` not serviceable; COD only if the last digit is even). Show ETA text and COD availability; remember last pincode in `localStorage`.
2. Checkout address pincode field: same hook, plus auto-fill city/state from a small local pincode prefix map as a stub.
3. Coupon field in the cart: the real validation endpoint arrives with B4; build the UI with a stubbed `validateCoupon(code)` returning typed outcomes (`valid`, `expired`, `min_order_not_met`, `unknown`).

**Acceptance criteria**
- [ ] Format error (5 digits) is instant and local; serviceability check only fires for 6 valid digits.
- [ ] A slow response for an old pincode never overwrites the result for the newer one.
- [ ] While checking, the field shows a spinner and the "Continue" button is disabled only if the result is required.
- [ ] Each coupon outcome has a distinct, human message.

**Stretch.** Display the cut-off ("Order within 2 hrs 14 mins for delivery by Thu") using `useCountdown`.

**Resources.** RHF `validate`: https://react-hook-form.com/docs/useform/register#options · MDN `<input pattern>`: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/pattern

### 7.7 Multi-step checkout form

**Concept.** A multi-step form is one logical form spread across routes. Keep **one form state** for the flow (`FormProvider` in the checkout layout, or a store), validate **per step** (`trigger(fieldNames)` or per-step schemas), persist drafts across refreshes (`sessionStorage`), and make each step a URL so Back/Forward and refresh work.

**Why it matters in ShopSphere.** Checkout is the money page. Users go back and forth, refresh, or get logged out; data must not vanish.

**Library/API.** `FormProvider`/`useFormContext`, per-step Zod schemas merged into one with `.merge`/`.extend` (Zod 4: use `.extend` or spread shapes), `trigger`, `useNavigate`, `sessionStorage`, `useReducer` for step state if needed.

**Hands-on task.** Under `/checkout`: steps `address` (pick saved address or add new) → `delivery` (standard / express + date/time slot grid) → `payment` (Razorpay / COD radio only; real payment in Stage 11) → `review` (summary, place order button disabled; real order in Stage 11). A step indicator reflects URL progress; visiting `/checkout/payment` directly without prior steps redirects to the first incomplete step. A sticky order-summary panel (from the Stage 1 `computeTotals` with fixture cart lines) shows on desktop.

**Acceptance criteria**
- [ ] Next is blocked until the step validates; the first invalid field gets focus.
- [ ] Back preserves entered data; refresh restores the draft; completing/placing clears it.
- [ ] Direct deep-link to a later step redirects correctly.
- [ ] Every step is keyboard-completable; progress is announced (`aria-current="step"`).

**Stretch.** Per-step schema derived from one master schema using `pick`.

**Resources.** FormProvider: https://react-hook-form.com/docs/formprovider · `trigger`: https://react-hook-form.com/docs/useform/trigger · Multi-step form a11y: https://www.w3.org/WAI/tutorials/forms/multi-page/

### 7.8 File upload with preview (avatar and review photos)

**Concept.** `<input type="file">` gives `File` objects. Preview with `URL.createObjectURL(file)` and **always** `URL.revokeObjectURL` on cleanup (an effect with cleanup: memory leak otherwise). Validate type and size client-side (convenience), send via `FormData` (do not set `Content-Type` manually; the browser adds the boundary). Progress events require `XMLHttpRequest` (or axios); `fetch` upload progress is not widely available.

**Why it matters in ShopSphere.** Profile avatar, review photos, return-request photos, and seller product images.

**Library/API.** `File`, `FileReader` vs object URLs, `FormData`, `z.instanceof(File)` with `.refine` on size/type, drag-and-drop events (`onDrop`, `dataTransfer.files`), `XMLHttpRequest.upload.onprogress`, base-ui/shadcn primitives for the dropzone.

**Hands-on task.** Build `ImageDropzone` (max 5 images, max 2 MB each, JPEG/PNG/WebP; drag-drop + click + paste; thumbnails with remove; error list). Use in the profile avatar (single) and in the review form (multi). Implement `uploadImage(file, { onProgress, signal })` with XHR to `POST /uploads/images`. If B7 is not built yet, simulate with a `setTimeout` progress and keep the same function signature, then swap it later without touching UI.

**Acceptance criteria**
- [ ] Preview appears instantly; object URLs are revoked on removal and unmount (verify via a counter in dev).
- [ ] Invalid type/size shows a specific message and is not added.
- [ ] Cancel aborts an in-flight upload.
- [ ] The form payload contains a `File[]` validated by the schema.

**Stretch.** Client-side resize/compress with `<canvas>` or `createImageBitmap` before upload; measure the saving.

**Resources.** MDN file input: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file · URL.createObjectURL: https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static · FormData: https://developer.mozilla.org/en-US/docs/Web/API/FormData · File drag and drop: https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop

### Checkpoint: explain it without notes (Stage 7)
1. Why is RHF fast, and what is the cost of `watch("field")` at the form root?
2. What are `z.input` and `z.output` and when do they differ?
3. How do you show a server "email already exists" error and why must the client never be the only validator?
4. Why use `field.id` as a key in `useFieldArray`?
5. How do you prevent stale async validation results from appearing?
6. What leaks if you forget `URL.revokeObjectURL`?
7. How does a multi-step form survive refresh and Back?

**Tag:** `git tag stage-07-done`.

---

## Stage 8: State ownership and Context

| | |
| --- | --- |
| **Guide stage** | 6 State and Server State: State Ownership, Context and State Patterns |
| **Needs** | **B0/B2**. B3 (cart API) is needed in Stage 9, so the cart here is deliberately local (guest cart) |
| **Time** | 1 week |
| **Branch prefix** | `s08/` |
| **Pages** | cart drawer + `/cart` (local), compare tray + `/compare`, theme toggle, toasts, auth context skeleton |

### 8.1 ⚡ SKIM: Local, lifted and derived state; `useReducer`

**Concept.** Keep state as close as possible to where it is used; lift to the nearest common parent when two siblings need it; derive everything else. `useReducer` fits state with many related transitions.

**Why it matters in ShopSphere.** Most state in the shop is local (gallery index, dialog open). Resist globalizing it.

**Library/API.** `useState`, `useReducer`, lifting state up, composition (`children`) to avoid prop drilling.

**Hands-on task.** Refactor the checkout stepper state (`step`, `visited`, `completed`) into a typed `useReducer` with discriminated-union actions. Show one example where passing `children` solves prop drilling without Context.

**Acceptance criteria**
- [ ] Reducer is pure and exhaustive (`assertNever`).
- [ ] You can name two states you deliberately left local and why.

**Resources.** Sharing state: https://react.dev/learn/sharing-state-between-components · Extracting state logic into a reducer: https://react.dev/learn/extracting-state-logic-into-a-reducer · Passing data deeply with Context: https://react.dev/learn/passing-data-deeply-with-context

### 8.2 Context: Auth, Theme, Toast providers

**Concept.** Context lets any descendant read a value without prop drilling. Every consumer re-renders when the provider's `value` changes (by reference). Great for low-frequency app-wide values (current user, theme, locale); poor for fast-changing state (cart quantities, form values). Expose context via a custom hook that throws if used outside the provider.

**Why it matters in ShopSphere.** `AuthContext` (status, user), `ThemeContext` (light/dark/system), `ToastProvider`, later `LocaleContext`. These are the legitimate uses of Context.

**Library/API.** `createContext`, `useContext` (React 19 also allows `use(Context)` and `<Context value={...}>` as the provider), `useMemo` for the value, `sonner` `<Toaster />`.

**Hands-on task.**
1. `features/auth/AuthProvider.tsx` + `useAuth()`: `{ status: "loading"|"authenticated"|"anonymous", user, login(), logout() }` skeleton (real implementation in Stage 10; for now it wraps the dev stub from Stage 5). Replace the guard stub.
2. `ThemeProvider` with `light|dark|system`, writes a class on `<html>`, persists in `localStorage`, follows `prefers-color-scheme` when `system`. (Full polish in Stage 13.)
3. Add Sonner toasts via the shadcn `sonner` component; wire success/error toasts for address and wishlist actions.
4. Demonstrate the context re-render problem: put a ticking counter in a context with 50 consumers; profile; fix by splitting the context (state vs dispatch/actions) or by moving the ticker out.

**Acceptance criteria**
- [ ] `useAuth()` outside the provider throws a clear error.
- [ ] Provider `value` is memoized; Profiler shows consumers do not re-render on unrelated parent renders.
- [ ] Theme persists across reloads and respects the OS setting when `system`.
- [ ] You can state the rule: "Context is a delivery mechanism, not a state manager."

**Stretch.** `useSyncExternalStore`-based selector hook to avoid whole-context re-renders (this is how Zustand works internally).

**Common mistakes / observe in DevTools**
- Creating the provider `value` object inline: `value={{ user, login }}` re-renders every consumer on every parent render.
- One mega-context for everything.
- **React DevTools Profiler:** "Why did this render? Context changed".

**Resources.** useContext: https://react.dev/reference/react/useContext · createContext: https://react.dev/reference/react/createContext · Scaling up with reducer and context: https://react.dev/learn/scaling-up-with-reducer-and-context · Sonner: https://sonner.emilkowal.ski/ · shadcn Sonner: https://ui.shadcn.com/docs/components/sonner

### 8.3 Zustand: the cart UI store and compare store

**Concept.** Zustand is a tiny external store: `create` a hook with state and actions; components **subscribe to slices with selectors** and only re-render when that slice changes. Works outside React (`store.getState()`), has middleware (`persist`, `devtools`). It is ideal for *client-only global state*: UI flags, drafts, guest data.

**Why it matters in ShopSphere.** Cart drawer open/close, mini-cart badge, compare list (max 4), and the *guest* cart before login. Server data (logged-in cart) will live in Query in Stage 9, so decide boundaries carefully.

**Library/API.** `zustand`: `create<State>()((set, get) => ({...}))`, selectors `useStore((s) => s.items.length)`, `useShallow` from `zustand/react/shallow` for object/array selections, `persist` and `devtools` from `zustand/middleware`, `createJSONStorage`.

**Hands-on task.**
1. `features/cart/cartStore.ts`: `{ lines: CartLine[]; drawerOpen; add(sku, qty); setQty(sku, qty); remove(sku); clear(); toggleDrawer() }` with `persist` to `localStorage` (key and version). Totals are **selectors/derived** using Stage 1's `computeTotals`, never stored.
2. Build `CartDrawer` and `/cart` page on this store: stepper, remove, line totals, free-shipping progress bar ("Add ₹120 more for free delivery"), empty state, stock clamp.
3. `features/compare/compareStore.ts`: toggle up to 4 products; a floating tray; `/compare` page with a specs table, differences highlighted, "show only differences" switch.
4. Add Zustand devtools and watch actions in Redux DevTools.

**Acceptance criteria**
- [ ] Header badge subscribes only to the count (`useCartStore(s => s.lines.length)`); Profiler shows it does not re-render when drawer open state changes.
- [ ] Cart survives reload and syncs across tabs (`persist` + storage event rehydrate).
- [ ] Quantity > stock is clamped with a message; adding an already-present SKU increments.
- [ ] You can explain why totals are derived, and why `useCartStore()` without a selector is a smell.
- [ ] Compare enforces max 4 with a toast, persists, and works with keyboard.

**Stretch.** Write a `persist` `migrate` function to handle `version` bump (rename `qty` to `quantity`).

**Common mistakes / observe in DevTools**
- Selecting a new object/array every call (`s => ({ a: s.a })`) causing infinite re-renders: use `useShallow`.
- Putting API data in the store, duplicating what Query will do.
- **Redux DevTools:** action log and time travel with the zustand `devtools` middleware.

**Resources.** Zustand docs: https://zustand.docs.pmnd.rs/ · persist: https://zustand.docs.pmnd.rs/integrations/persisting-store-data · Redux awareness (guide): https://redux.js.org/introduction/why-rtk-is-redux-today

### 8.4 What does NOT belong in global state: the state audit

**Concept.** Choose the right home for each piece of state: **local** (`useState`), **URL** (shareable), **server cache** (Query), **form** (RHF), **global client** (Zustand/Context), **persistent browser** (`localStorage`). Duplicating server data into a global store is the most common architecture mistake.

**Why it matters in ShopSphere.** After Stage 9, you will have all six. The audit prevents drift.

**Library/API.** A decision table in your docs.

**Hands-on task.** Create `docs/state-audit.md`: list every piece of state in the app so far (25+ items), its current home, the *right* home, and a reason. Migrate at least three mis-homed items (e.g., filters in `useState` that should be URL; fetched address list inside a context that should be Query next stage).

**Acceptance criteria**
- [ ] Audit lists at least 25 items with a rationale each.
- [ ] Three migrations merged on separate small branches.
- [ ] You can defend each classification in one sentence.

**Stretch.** Draw the app's data-flow diagram (components, stores, URL, server).

**Resources.** Choosing state structure: https://react.dev/learn/choosing-the-state-structure · TkDodo "Working with Zustand": https://tkdodo.eu/blog/working-with-zustand · Redux "state vs server cache" (concept): https://redux.js.org/tutorials/essentials/part-7-rtk-query-basics

### 8.5 Undo toasts and optimistic UI feedback (preview)

**Concept.** Destructive or frequent actions feel better with immediate effect + undo, rather than confirm dialogs for everything.

**Why it matters in ShopSphere.** Removing a cart line, clearing compare, removing from wishlist.

**Library/API.** Sonner `toast("Removed", { action: { label: "Undo", onClick } })`, `toast.promise`.

**Hands-on task.** Implement undo for cart line removal and wishlist removal using toasts (restore from a captured snapshot). Use `toast.promise` for an address save.

**Acceptance criteria**
- [ ] Undo restores the line at the same position with the same quantity.
- [ ] Toasts are announced to assistive tech (Sonner uses a live region; verify).
- [ ] Multiple quick removals produce independent undoable toasts.

**Stretch.** Time-bound undo that commits to the server only after the toast expires.

**Resources.** Sonner: https://sonner.emilkowal.ski/ · ARIA live regions: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions

### Checkpoint: explain it without notes (Stage 8)
1. Where should each live: selected variant, cart lines of a logged-in user, drawer-open flag, filters, current user, theme?
2. Why does a Context value change re-render all consumers and how do selectors in Zustand avoid it?
3. Why are cart totals never stored?
4. What is the rule of thumb for lifting state vs using a store?
5. What is wrong with `const { lines, drawerOpen } = useCartStore()`?

**Tag:** `git tag stage-08-done`.

---

## Stage 9: Server state with TanStack Query

| | |
| --- | --- |
| **Guide stage** | 6 State and Server State: Remote Data and Caching, State Management Libraries |
| **Needs** | **B3** (cart, guest + merge). Ask Claude for B3 at the start of this stage. Orders list uses **B5**; if it is not built yet, do the orders topic at the start of Stage 11 |
| **Time** | 2 weeks |
| **Branch prefix** | `s09/` |
| **Pages** | migrate all lists/details to Query; `/cart` (server), `/wishlist`, `/orders`, `/orders/:id` (read-only), infinite lists, PDP dependent queries |

**The big idea.** Server data is not your state: it is a **cache of someone else's data** with a lifecycle (loading, fresh, stale, refetching, inactive, garbage-collected). TanStack Query manages that lifecycle. Open your `docs/pain-journal.md` and tick off each item as you meet it solved.

### 9.1 Setup, devtools, and the first migration: products list

**Concept.** `QueryClient` holds the cache; `QueryClientProvider` makes it available. `useQuery({ queryKey, queryFn })` returns `{ data, error, isPending, isFetching, isError, status, fetchStatus, refetch }`. **`isPending`** = no data yet; **`isFetching`** = a request is in flight (including background refetch). `queryFn` must return a promise and **throw** on error (your `api()` does).

**Why it matters in ShopSphere.** The same product appears on cards, PDP, wishlist, compare. Query de-duplicates identical in-flight requests and shares the cache between all of them.

**Library/API.** `@tanstack/react-query` v5, `@tanstack/react-query-devtools` (`ReactQueryDevtools`), `QueryClient`, `QueryClientProvider`, `useQuery`, `queryOptions`.

**Hands-on task.**
1. `npm i @tanstack/react-query @tanstack/react-query-devtools`. Create `lib/query-client.ts` (one `QueryClient` with defaults you will tune in 9.3) and wrap the app in `root.tsx` with `QueryClientProvider`; mount `<ReactQueryDevtools initialIsOpen={false} />` in dev only.
2. Replace `useProducts` (hand-rolled) with:

```ts
useQuery({ queryKey: ["products", "list", filters], queryFn: ({ signal }) => getProducts(filters, { signal }) })
```

3. Delete the old hook and its loading/error boilerplate. Keep your `AsyncView` UI by adapting `status`.
4. In the devtools, watch the query go `fetching` -> `fresh` -> `stale`; toggle "Offline"; click the refetch button.

**Acceptance criteria**
- [ ] `/products` works exactly as before with a fraction of the code; no `useEffect` for fetching remains in the catalog.
- [ ] Switching to another tab and back triggers a background refetch (observe in Network + devtools). You can say why and how to configure it.
- [ ] You can find the cache entry for your list in the devtools with its key and data.
- [ ] You can explain `isPending` vs `isFetching` with a ShopSphere example (first load vs paging).

**Stretch.** Read the "Important defaults" page and write the defaults in your own words.

**Common mistakes / observe in DevTools**
- Passing `queryFn: getProducts(filters)` (calling it) instead of a function.
- Creating `new QueryClient()` inside a component body (cache lost each render). Create once at module scope (or `useState(() => new QueryClient())`).
- Using `isLoading` when you mean `isPending`; know both (`isLoading = isFetching && isPending`).
- **Query DevTools:** key shown as array, status colors (fresh green, fetching blue, stale yellow, inactive gray), data explorer, "Trigger error".

**Resources.** Overview: https://tanstack.com/query/latest/docs/framework/react/overview · Quick start: https://tanstack.com/query/latest/docs/framework/react/quick-start · Important defaults: https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults · Queries: https://tanstack.com/query/latest/docs/framework/react/guides/queries · Devtools: https://tanstack.com/query/latest/docs/framework/react/devtools · TkDodo Practical React Query: https://tkdodo.eu/blog/practical-react-query

### 9.2 Query keys and the key factory

**Concept.** The key is the cache identity and the dependency array: when the key changes, Query fetches for the new key. Keys are hashed deterministically (object key order does not matter). Structure keys hierarchically so you can invalidate by prefix: `["products"]` invalidates every product query; `["products", "list"]` only lists.

**Why it matters in ShopSphere.** Mutations need to invalidate precisely: "after adding a review, refresh that product's reviews and the product's rating, not every list".

**Library/API.** Key factories, `queryOptions({ queryKey, queryFn })` (type-safe reuse in `useQuery`, `prefetchQuery`, `ensureQueryData`, `setQueryData`), `queryClient.invalidateQueries({ queryKey })`, `exact`, `predicate`.

**Hands-on task.** `lib/queryKeys.ts`:

```ts
export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (slug: string) => [...productKeys.details(), slug] as const,
}
```

Do the same for `cart`, `wishlist`, `orders`, `addresses`, `reviews(productId)`, `notifications`. Create `queryOptions` factories (`productQueries.detail(slug)`) in each feature's `queries.ts`. Migrate the PDP, categories, brands, addresses, wishlist, orders list to `useQuery`.

**Acceptance criteria**
- [ ] No inline string-array keys in components; all keys come from factories.
- [ ] From the console in dev (`window.queryClient` exposed in dev), `invalidateQueries({ queryKey: productKeys.lists() })` refetches only active lists.
- [ ] `queryOptions` is reused by hook, prefetch (9.7) and tests (Stage 12).

**Stretch.** Explain why objects in keys must be serializable and stable (no functions, no class instances).

**Resources.** Query keys: https://tanstack.com/query/latest/docs/framework/react/guides/query-keys · queryOptions: https://tanstack.com/query/latest/docs/framework/react/guides/query-options · Query invalidation: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation · TkDodo "Effective query keys": https://tkdodo.eu/blog/effective-react-query-keys

### 9.3 Freshness: `staleTime`, `gcTime`, refetch triggers, and pagination UX

**Concept.** **`staleTime`** = how long data counts as fresh (no refetch on mount/focus/reconnect). Default `0` means "always stale, refetch on every new observer". **`gcTime`** (v5 name; formerly `cacheTime`) = how long *inactive* data is kept (default 5 min). Refetch triggers: mount, window focus, reconnect, interval, invalidation. `placeholderData: keepPreviousData` shows the previous page while the next loads, so there is no skeleton flash.

**Why it matters in ShopSphere.** Product catalogs change rarely (minutes), stock and cart change fast (seconds), order status changes by events. One global default is wrong; choose by data type.

**Library/API.** `staleTime`, `gcTime`, `refetchOnWindowFocus`, `refetchOnReconnect`, `refetchInterval`, `retry`, `retryDelay`, `placeholderData`, `keepPreviousData` (import from `@tanstack/react-query`), `isPlaceholderData`.

**Hands-on task.** Decide and apply a freshness policy and write it in `docs/query-policy.md`:

| Data | Suggested `staleTime` | Notes |
| --- | --- | --- |
| Categories, brands | 30 min | rarely change |
| Product list/detail | 1 to 5 min | price/stock may change |
| Stock/price on PDP | 15 to 30 s | refetch on focus |
| Cart | 0 to 10 s | mutation-driven; always invalidate |
| Orders | 30 s + polling on active order | |
| Deals | 15 s | flash-sale accuracy |
| Notifications | 0, updated by socket | |

Set `retry` smartly: no retry for 4xx (`retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2`). Add `keepPreviousData` to the product listing and show a subtle "updating" bar using `isFetching`.

**Acceptance criteria**
- [ ] Going list -> PDP -> back shows the list instantly with no skeleton (fresh cache), and refetches silently if stale.
- [ ] Changing page keeps the old grid visible (dimmed) while loading.
- [ ] 404 on a product does not retry 3 times with backoff delay.
- [ ] Your written policy matches observed behaviour in the Network tab.

**Stretch.** Measure with throttling: time-to-content on revisiting a product page before and after.

**Common mistakes / observe in DevTools**
- Leaving `staleTime: 0` and wondering why every navigation refetches.
- Setting a huge `staleTime` on data that must be fresh (stock).
- Misreading `gcTime`: it only counts after the last observer unmounts.
- **Network tab:** count requests on tab refocus.

**Resources.** Caching: https://tanstack.com/query/latest/docs/framework/react/guides/caching · Paginated queries: https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries · Query retries: https://tanstack.com/query/latest/docs/framework/react/guides/query-retries · TkDodo "Status checks": https://tkdodo.eu/blog/status-checks-in-react-query

### 9.4 Mutations and invalidation: addresses, cart, reviews

**Concept.** `useMutation({ mutationFn, onSuccess, onError, onSettled })` for create/update/delete. Mutations do not cache; after success you **invalidate** related queries so they refetch, or **write** the result straight into the cache with `setQueryData` when the response contains the new data.

**Why it matters in ShopSphere.** Every write: address CRUD, add to cart, apply coupon, place order, cancel, review.

**Library/API.** `useMutation`, `mutate` vs `mutateAsync`, `isPending`, `variables`, `onSuccess(data, vars, ctx)`, `queryClient.invalidateQueries`, `queryClient.setQueryData`, global handlers via `new QueryClient({ queryCache: new QueryCache({ onError }), mutationCache: new MutationCache({ onError }) })`.

**Hands-on task.** Migrate Stage 6's address CRUD: four mutations; on success invalidate `addressKeys.all`; `toast` success; map `ApiError` to a toast or to form errors (via the RHF `setError` from Stage 7: use `mutateAsync` in a try/catch there). Add a **global mutation error** handler for unexpected 5xx/network errors that shows one consistent toast, with a `meta: { silent: true }` escape hatch for mutations that handle errors themselves.

**Acceptance criteria**
- [ ] The address list updates after each mutation without any manual refetch call.
- [ ] Per-row pending state uses `mutation.variables` (or the `useMutationState` helper), not a hand-rolled map.
- [ ] Double submit is impossible (button disabled with `isPending`).
- [ ] A 500 shows exactly one toast, not two.

**Stretch.** Show an "unsaved changes syncing" indicator using `useIsMutating()`.

**Resources.** Mutations: https://tanstack.com/query/latest/docs/framework/react/guides/mutations · Invalidations from mutations: https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations · Updates from mutation responses: https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses · TkDodo "Mastering mutations": https://tkdodo.eu/blog/mastering-mutations-in-react-query

### 9.5 Optimistic updates: wishlist and quantity changes

**Concept.** Update the UI **before** the server confirms, and roll back on error. Two approaches in v5: (1) **cache-based**: in `onMutate` cancel outgoing queries, snapshot, `setQueryData`; in `onError` restore; in `onSettled` invalidate; (2) **UI-based**: render from `mutation.variables` while `isPending`, no cache surgery. Use (2) for simple toggles, (1) when many components read the same cache.

**Why it matters in ShopSphere.** Hearts and quantity steppers must feel instant even on a slow phone connection.

**Library/API.** `onMutate`, `cancelQueries`, `getQueryData`, `setQueryData(updater)`, `onError(err, vars, context)`, `onSettled`, `useMutationState`. React 19's `useOptimistic` exists but Query's own mechanisms integrate with the cache better.

**Hands-on task.** Replace Stage 6's hand-rolled optimistic wishlist with Query: cache-based version updating both `wishlistKeys.ids()` and any open `wishlistKeys.list()`. Then optimistic cart quantity: stepper changes the line immediately, debounced 400 ms network call per line, and the last response wins (avoid out-of-order). Rollback and error toast on failure; ensure the product detail heart and header count update together.

**Acceptance criteria**
- [ ] Toggling the heart is instant with latency throttled to Slow 3G.
- [ ] Forcing a server error (stop backend) rolls back and shows one toast.
- [ ] Rapid +/+/+ results in correct final quantity and at most one request after the debounce.
- [ ] You can narrate `onMutate`/`onError`/`onSettled` in order, including why `cancelQueries` is needed (an in-flight refetch could overwrite the optimistic value).

**Stretch.** Optimistic add-to-cart with a temporary line id and reconciliation.

**Common mistakes / observe in DevTools**
- Mutating cached data in place (`old.items.push(...)`) instead of returning a new object.
- Forgetting `onSettled` invalidation so client drifts from server.
- Not cancelling in-flight queries first.
- **DevTools:** watch the cache entry flip immediately, then settle after `invalidate`.

**Resources.** Optimistic updates: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates · TkDodo "Concurrent optimistic updates": https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query · useOptimistic: https://react.dev/reference/react/useOptimistic

### 9.6 The server cart (B3) and the guest/user split

**Concept.** Logged-in cart = server state (Query). Guest cart = client state (Zustand + persist, Stage 8) *or* a server cart identified by a guest token (B3 supports `x-cart-token`). Pick **one source of truth at a time** behind a single facade hook so components do not care.

**Why it matters in ShopSphere.** The header badge, drawer, PDP "Add to cart", cart page and checkout all use the cart; merging on login is a classic source of bugs.

**Library/API.** `useCart()` facade, `useMutation`, Query, `localStorage` guest token (the token is not a secret credential but identifies a cart).

**Hands-on task.** Implement `features/cart/useCart.ts` returning `{ lines, totals, count, add, setQty, remove, saveForLater, moveToCart, isPending }` backed by the server cart via Query for both guests (token header) and users (JWT). Retire the Zustand lines (keep Zustand for `drawerOpen` UI state only). Use the API's totals if provided, otherwise `computeTotals` (decide and write down why you trust one). Show stock warnings per line from the API (`availableQty`, `priceChanged`). Handle a **409** (stock changed) by refetching and showing a warning banner on the affected line.

**Acceptance criteria**
- [ ] Refreshing, closing and reopening the browser keeps the guest cart (token persisted).
- [ ] Two tabs stay consistent after focus-refetch.
- [ ] Adding more than stock yields a clear inline message, not a silent clamp or crash.
- [ ] Save for later moves a line between the two lists without a page reload.
- [ ] Drawer open state is Zustand; lines are Query; you can say why.

**Stretch.** Broadcast cart changes across tabs with `BroadcastChannel` that invalidates the cart key.

**Resources.** Query "mutations and invalidations" (above) · Zustand + Query: https://tkdodo.eu/blog/working-with-zustand

### 9.7 Prefetching and seeding the cache

**Concept.** `queryClient.prefetchQuery(options)` loads data before it is needed (on link hover/focus, or after a route renders). `initialData`/`setQueryData` can seed a detail query from list data so navigation is instant while a full fetch happens in the background.

**Why it matters in ShopSphere.** Hover-to-prefetch makes product pages feel instant; list-to-detail seeding avoids skeletons.

**Library/API.** `prefetchQuery`, `ensureQueryData`, `queryClient.getQueryData`, `initialData`, `initialDataUpdatedAt`, `placeholderData: () => ...`.

**Hands-on task.** (1) On `ProductCard` `onMouseEnter`/`onFocus` (debounced 100 ms) prefetch `productQueries.detail(slug)`. (2) Seed the detail query's `placeholderData` from the matching list item found via `queryClient.getQueriesData`. (3) Prefetch the next page of results when the user nears the bottom. (4) Prefetch `categories` at app start.

**Acceptance criteria**
- [ ] Hovering a card then clicking shows the PDP with complete data instantly; Network shows the request started on hover.
- [ ] With only list data, PDP shows basic fields immediately and fills the rest on arrival, with no layout jump.
- [ ] Prefetch does not fire for touch scroll flicks (hover only on pointer devices).

**Stretch.** Prefetch route code chunks (`import()` the PDP route on hover) alongside data.

**Resources.** Prefetching: https://tanstack.com/query/latest/docs/framework/react/guides/prefetching · Initial query data: https://tanstack.com/query/latest/docs/framework/react/guides/initial-query-data · Placeholder data: https://tanstack.com/query/latest/docs/framework/react/guides/placeholder-query-data

### 9.8 Infinite queries: recommendations and reviews

**Concept.** `useInfiniteQuery` manages pages as `data.pages`, fetching the next with `fetchNextPage`. You supply `initialPageParam` and `getNextPageParam(lastPage, allPages)` returning the next param or `undefined` at the end.

**Why it matters in ShopSphere.** "Load more" for reviews, orders, notifications and the mobile feed.

**Library/API.** `useInfiniteQuery({ queryKey, queryFn: ({ pageParam, signal }) => ..., initialPageParam: 1, getNextPageParam, maxPages? })`, `fetchNextPage`, `hasNextPage`, `isFetchingNextPage`, `data.pages.flatMap(p => p.items)`.

**Hands-on task.** Rebuild the Stage 6 infinite product feed and a reviews list with `useInfiniteQuery`, sentinel via `IntersectionObserver` + a manual "Load more" button. Retain your dedupe if the API can duplicate items across pages when new items arrive.

**Acceptance criteria**
- [ ] Code for infinite loading is < 40 lines vs your hand-rolled version; compare line counts in notes.
- [ ] Error on page 3 retains pages 1 to 2 with an inline retry.
- [ ] Changing filters starts from page 1 with the correct key.

**Stretch.** `maxPages` to bound memory and compare with virtualization (Stage 13).

**Resources.** Infinite queries: https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries · useInfiniteQuery: https://tanstack.com/query/latest/docs/framework/react/reference/useInfiniteQuery

### 9.9 Dependent and parallel queries, Suspense (optional)

**Concept.** **Dependent**: a query waits for another's data via `enabled: !!id`. **Parallel**: multiple `useQuery` calls or `useQueries` run concurrently. Query also supports `useSuspenseQuery` with React `<Suspense>` and an error boundary (`QueryErrorResetBoundary`).

**Why it matters in ShopSphere.** The PDP loads the product first; reviews, Q&A and similar products need `product._id`. The home page loads many independent rails.

**Library/API.** `enabled`, `useQueries`, `useSuspenseQuery`, `QueryErrorResetBoundary`, React `Suspense`.

**Hands-on task.** PDP: product query -> dependent `reviews`, `questions`, `similar` queries (`enabled` after product loaded), each in its own section with independent skeleton/error. Home: eight parallel rail queries each wrapped in its own boundary so one failure does not break others. Try one rail with `useSuspenseQuery` + `Suspense` + `ErrorBoundary` and compare the code to the `isPending` branches.

**Acceptance criteria**
- [ ] Network waterfall is intentional: PDP data first, then dependants (screenshot the waterfall and annotate).
- [ ] A failing reviews section shows a retry button, and the rest of the PDP is unaffected.
- [ ] You can explain when `enabled: false` leaves `status: "pending"` and `fetchStatus: "idle"`.

**Stretch.** Remove the waterfall: ask Claude for a `GET /products/:slug?include=reviews,similar` or fetch by ids in parallel; weigh complexity vs speed.

**Resources.** Dependent queries: https://tanstack.com/query/latest/docs/framework/react/guides/dependent-queries · Parallel queries: https://tanstack.com/query/latest/docs/framework/react/guides/parallel-queries · Suspense: https://tanstack.com/query/latest/docs/framework/react/guides/suspense · React Suspense: https://react.dev/reference/react/Suspense

### 9.10 Polling and orders (B5 when ready)

**Concept.** `refetchInterval` polls; make it a function of the data so it stops when no longer needed (`(query) => isTerminal(query.state.data?.status) ? false : 5000`). Pause when the tab is hidden (default) unless `refetchIntervalInBackground`.

**Why it matters in ShopSphere.** Order status screens and payment confirmation (webhook delay) must keep updating until a final state, then stop.

**Library/API.** `refetchInterval`, `refetchIntervalInBackground`, `select`, `useQuery` for `/orders`, `/orders/:id`.

**Hands-on task.** Build `/orders` (infinite list, status filter chips in the URL, search) and `/orders/:orderId` (read-only for now) on Query. Poll an order every 5 s while `status` is non-terminal, and stop on `delivered`/`cancelled`. Add the `OrderStatusBadge` using your Stage 2 union helpers.

**Acceptance criteria**
- [ ] Polling stops at terminal states (Network tab shows requests cease).
- [ ] Navigating away stops polling (no leaked intervals).
- [ ] If B5 is not ready, you used a stubbed `orderQueries` with `queryFn` returning fixtures, and swapped to real later with no component change.

**Stretch.** Exponential backoff polling (`refetchInterval` grows) for payment verification.

**Resources.** Polling in Query: https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults · useQuery reference (`refetchInterval`): https://tanstack.com/query/latest/docs/framework/react/reference/useQuery

### 9.11 Migration retrospective and boundaries

**Concept.** Query owns **server state**; Zustand/Context own **client state**; RHF owns **form state**; the URL owns **shareable state**. Overlap is the bug.

**Why it matters in ShopSphere.** You are about to add real-time and auth, both of which interact with the cache.

**Library/API.** Devtools, your pain journal, state audit.

**Hands-on task.** (1) Delete every hand-written fetching hook; `grep` proves no `useEffect` fetches remain. (2) Tick the pain journal: for each line write "solved by X" or "still painful". (3) Update `docs/state-audit.md`. (4) Write `docs/migration-retro.md`: lines of code removed, requests saved (compare Network request counts for the same user flow before/after), bugs you no longer can have.

**Acceptance criteria**
- [ ] Zero `useEffect`+`fetch` pairs for server data remain.
- [ ] Request count for "home -> product -> back -> product" is lower than before (record numbers).
- [ ] Every pain journal entry has a resolution.

**Stretch.** Persist the Query cache for offline-first with `@tanstack/query-persist-client-core` / `persistQueryClient`; discuss security of persisted user data.

**Resources.** Query docs home: https://tanstack.com/query/latest · Query FAQ: https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state

### Checkpoint: explain it without notes (Stage 9)
1. What is the difference between `staleTime` and `gcTime`?
2. What does `isPending` mean vs `isFetching`? What is `fetchStatus`?
3. Walk through an optimistic update step by step, including rollback.
4. Why are query keys the dependency array, and how do you design them for invalidation?
5. Why is the cart a hybrid (guest vs user) and how does the facade hide it?
6. When should you not use Query? (Hint: form drafts, UI toggles.)
7. How does `placeholderData: keepPreviousData` change UX versus `initialData`?

**Tag:** `git tag stage-09-done`.

---

## Stage 10: Authentication end to end

| | |
| --- | --- |
| **Guide stage** | 5 and 6 applied (HTTP, state) with a security lens |
| **Needs** | **B10** (Google OAuth, email verification/reset, sessions). Ask Claude for B10 at the start of this stage. Login/register/refresh/me already exist from B0 |
| **Time** | 1.5 weeks |
| **Branch prefix** | `s10/` |
| **Pages** | real `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/auth/google/callback`, `/account/security`, guards, session-expiry UX |

### 10.1 The token model: access in memory, refresh in an httpOnly cookie

**Concept.** Two tokens with different jobs. The **access token** (JWT, 15 min) is sent as `Authorization: Bearer` and kept **in memory only** (a module variable/React state), so XSS cannot steal it from storage (XSS can still *use* the app while the page is open, so you must still prevent XSS). The **refresh token** lives in an **httpOnly, Secure, SameSite cookie** that JavaScript cannot read; it is sent automatically to the refresh endpoint; the server **rotates** it on every use and detects reuse (a stolen old refresh token revokes the session family). On a page reload, memory is empty, so the app silently calls refresh to get a new access token.

**Why it matters in ShopSphere.** Choosing where a token lives is a security decision. `localStorage` tokens are readable by any injected script; cookies need CSRF consideration (`SameSite`, refresh endpoint is POST-only and reads no state-changing params).

**Library/API.** `fetch` with `credentials: "include"`, CORS with credentials, `Set-Cookie` attributes (`HttpOnly`, `Secure`, `SameSite`, `Path`), JWT structure (header.payload.signature; payload is readable, not secret), JWT `exp`.

**Hands-on task.** Draw (paper or Excalidraw) the sequence diagram of: register -> login -> API call -> expiry -> refresh -> rotation -> logout, and reuse detection. In the browser: log in, then in DevTools > Application > Cookies find the refresh cookie (flags!), try `document.cookie` (cannot read it), decode your access token at the console with `JSON.parse(atob(token.split(".")[1]))`. Write a half-page "Why not localStorage?" in your notes.

**Acceptance criteria**
- [ ] Diagram includes every request/response and where each token is stored.
- [ ] You verified the cookie has `HttpOnly`, correct `SameSite` and path.
- [ ] You can explain what rotation and reuse detection protect against.

**Resources.** MDN cookies: https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies · MDN `Set-Cookie`: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie · OWASP session management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html · jwt.io introduction: https://jwt.io/introduction

### 10.2 The real `AuthProvider`: bootstrap, login, logout

**Concept.** On app load, auth status is **unknown**. Try `POST /auth/refresh` (cookie) then `GET /auth/me`; if both succeed you are authenticated, else anonymous. Until resolved, status is `"loading"` and guards must not redirect.

**Why it matters in ShopSphere.** This eliminates the "flash of login page" on refresh and is the backbone of every guarded route.

**Library/API.** `useQuery` for `me` (`staleTime: Infinity`) or a bootstrap effect in the provider; `useMutation` for login/register/logout; `queryClient.setQueryData(["me"], user)`; `queryClient.clear()` on logout; the API client's `configureApi({ getAccessToken })`.

**Hands-on task.** Replace the dev stub with real auth: `accessToken` stored in a module-level variable (with a tiny subscribe mechanism) or in a ref in the provider and read by the API client; `login`, `register`, `logout` mutations; bootstrap; `useAuth()` unchanged for consumers. Set `queryClient.setQueryData(authKeys.me, user)` on success.

**Acceptance criteria**
- [ ] Refresh keeps you logged in (silent refresh); no flash of unauthenticated UI (loading skeleton instead).
- [ ] Logout clears the token, **clears the Query cache** (no previous user's data visible), navigates home, and the cookie is cleared by the server.
- [ ] `localStorage` does not contain tokens (check Application tab).
- [ ] StrictMode double-run of the bootstrap does not cause two conflicting refreshes (single-flight, see 10.3).

**Common mistakes / observe in DevTools**
- Running bootstrap in an effect without handling double-invocation (rotating refresh tokens invalidate the second call!). This is a real StrictMode pitfall with rotation: dedupe with a shared in-flight promise.
- Leaking the previous user's cached data after logout/login-as-another-user.
- **Network tab:** at page load you should see exactly one `refresh` then one `me`.

**Resources.** React Context for auth: https://react.dev/learn/passing-data-deeply-with-context · TanStack Query auth patterns (discussion/guides): https://tanstack.com/query/latest/docs/framework/react/guides/query-functions · MDN `credentials`: https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials

### 10.3 401 handling and single-flight refresh

**Concept.** When an API call returns **401** (access token expired), refresh **once**, then retry the original request. If many requests fail simultaneously, they must **share one refresh** (a single in-flight promise) and replay afterwards. If refresh itself fails, the session is dead: log out and redirect.

**Why it matters in ShopSphere.** The cart drawer, notifications, and orders fire parallel requests; with rotation, two concurrent refreshes would invalidate each other and log the user out.

**Library/API.** Promise memoization (`let refreshing: Promise<string> | null`), your `api()` wrapper retry-once logic with a `_retried` flag, `onUnauthorized` callback, `BroadcastChannel`.

**Hands-on task.** Implement in `lib/api/client.ts`: on 401 for authenticated calls (not for `/auth/*`), `await refreshOnce()` then retry the request once. Protect against loops. On refresh failure call `onUnauthorized` (logout + toast + redirect with `from`). To test, ask Claude (or temporarily configure the backend `.env`) for a 10-second access-token lifetime, then fire 6 parallel requests after expiry.

**Acceptance criteria**
- [ ] Six parallel requests after expiry produce **one** refresh call in the Network tab and six successful retries.
- [ ] Deleting the refresh cookie then making a request logs you out cleanly with a "Session expired" toast and returns you to `/login?from=...`.
- [ ] No infinite refresh loop when `/auth/refresh` returns 401.
- [ ] Query does not retry 401s 3 times on its own (your `retry` function from 9.3).

**Resources.** Promise: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise · HTTP 401: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401

### 10.4 Protected routes, roles and return-to

**Concept.** Wire the Stage 5 guards to the real `status`/`user`. UI role gating hides things; the **API enforces** permission. Preserve the user's intent (deep link) across login.

**Why it matters in ShopSphere.** `/checkout`, `/orders`, `/account/*`, `/seller` must be protected, and admins/sellers see different menus.

**Library/API.** `RequireAuth`, `PublicOnly`, `RequireRole`, `location.state.from`, safe redirect validation.

**Hands-on task.** Swap the stub for real auth; show a `Skeleton` while `"loading"`; redirect with `state.from` (pathname+search+hash); after login navigate back **only to same-origin relative paths** (reject `//evil.com`, `https://...`): write `safeRedirect(path)`; account menu shows role-specific links; build a 403 page.

**Acceptance criteria**
- [ ] Opening `/orders/123` logged out -> login -> lands on `/orders/123`.
- [ ] `?from=https://evil.com` and `?from=//evil.com` are ignored.
- [ ] A customer calling a seller route sees 403 UI, and the API call itself also returns 403 (test with `curl`).

**Resources.** OWASP unvalidated redirects: https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html

### 10.5 Email verification and password reset (B10)

**Concept.** Emails contain **single-use, expiring tokens** in links. The frontend page reads the token from the URL, calls the API, and shows success/expired/invalid states. Remove the token from the URL after reading (`replace`) so it does not leak via history/referrer.

**Why it matters in ShopSphere.** Unverified accounts cannot checkout (suggested rule); reset must not reveal whether an email exists.

**Library/API.** `useSearchParams`, `useMutation`, RHF + Zod (new password schema), `useCountdown` (resend cooldown), Mailpit UI (`http://localhost:8025`).

**Hands-on task.**
1. After register: "Check your email" screen with resend (60 s cooldown using `useCountdown`) and an **unverified banner** in the shell for logged-in unverified users.
2. `/verify-email?token=...`: auto-verifies on load (use a mutation triggered once; guard against StrictMode double fire: the token is single-use!), handles `success`, `expired` (offer resend) and `invalid`.
3. `/forgot-password` (always shows the same neutral confirmation) and `/reset-password?token=...` with the strong-password schema; success redirects to login with a toast.
4. Read all emails in Mailpit; click through the real links.

**Acceptance criteria**
- [ ] Verification link works exactly once; a second click shows a sensible "already verified/invalid" state, not a crash.
- [ ] StrictMode does not burn the token (single execution guard).
- [ ] Forgot-password response is identical for existing and non-existing emails.
- [ ] Reset form validates, shows server errors, and old sessions are invalidated (log in elsewhere; confirm the server revoked them per B10 behavior).
- [ ] Token is removed from the address bar after load.

**Resources.** MDN Referrer-Policy: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy · OWASP forgot password: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html

### 10.6 Google sign-in (B10)

**Concept.** With a **server-side authorization-code flow**, the browser never sees Google's tokens: it navigates to the backend (`GET /auth/google`), which redirects to Google, then Google redirects to the backend callback, which creates/links the user, sets the refresh cookie, and redirects back to the frontend (`/auth/google/callback`). The frontend then does the normal silent refresh to obtain an access token. A `state` parameter (managed by the backend) prevents CSRF on the flow.

**Why it matters in ShopSphere.** Social login is a conversion feature; the flow shows how cookies and redirects replace JS token handling.

**Library/API.** Plain anchor/`window.location.assign(`${apiOrigin}/auth/google?redirect=${encodeURIComponent(from)}`)`, `useAuth().refresh()`, error query params (`?error=access_denied`).

**Hands-on task.** Add "Continue with Google" buttons on login/register. Implement `/auth/google/callback`: show a spinner, call bootstrap (refresh + me), navigate to the safe `from`, or show the error state. Read Claude's backend docs for the Google Cloud console steps (OAuth client with redirect URI `http://localhost:4000/api/v1/auth/google/callback`) and create test credentials. Handle "user cancelled" and "account exists with password" cases.

**Acceptance criteria**
- [ ] Full round trip works locally and lands on the original page.
- [ ] Cancelling at Google shows a friendly message, not a blank page.
- [ ] After Google login, `useAuth().user` is populated identically to password login.

**Resources.** Google OAuth web server flow: https://developers.google.com/identity/protocols/oauth2/web-server · OAuth 2.0 simplified: https://www.oauth.com/ · Authorization code flow overview: https://oauth.net/2/grant-types/authorization-code/

### 10.7 Sessions, security page and expiry UX

**Concept.** Users should see and revoke their sessions; changing a password should end other sessions; expiry should never lose work silently.

**Why it matters in ShopSphere.** Trust and compliance.

**Library/API.** `/account/security` forms (RHF + Zod), session list endpoint (B10), `BroadcastChannel` for cross-tab logout, `visibilitychange` re-validation.

**Hands-on task.** Build `/account/security`: change password (current + new + confirm), "Active sessions" list (device/browser, last active, this device badge, revoke), "Log out of all devices". Add multi-tab logout (logout in tab A logs out tab B), and an idle warning dialog after N minutes of inactivity with a "Stay signed in" action (calls refresh).

**Acceptance criteria**
- [ ] Revoking another session makes that session fail at its next refresh.
- [ ] Logout in one tab logs out the other within a second.
- [ ] If a form is open when the session expires, the user is redirected to login and the draft is restored after login (store draft in `sessionStorage`).

**Resources.** BroadcastChannel: https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel · Page Visibility: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API

### 10.8 Login side effects: merge guest data

**Concept.** Logging in is an event that triggers reconciliation: merge guest cart into the user cart (B3), merge guest wishlist, and sync recently viewed.

**Why it matters in ShopSphere.** Dropping a guest's cart at login is the most common conversion bug in e-commerce.

**Library/API.** `useMutation` for `POST /cart/merge`, `queryClient.invalidateQueries`, `localStorage` guest data.

**Hands-on task.** After a successful login/registration/Google callback: call merge endpoints, clear the guest token, invalidate `cart`/`wishlist`, show a toast "We moved 3 items from your guest cart". Handle conflicts (item no longer in stock; cap quantity).

**Acceptance criteria**
- [ ] Guest adds 3 items -> logs in with an account having 2 overlapping items -> final cart has correct merged quantities.
- [ ] Merge happens exactly once even with StrictMode and fast navigation.
- [ ] Failure in merge does not block login; it shows a retry option.

### 10.9 Frontend security hygiene

**Concept.** React escapes text by default, so XSS enters through `dangerouslySetInnerHTML`, `href="javascript:..."`, untrusted URLs in `src`, third-party scripts and injected rich text (reviews, Q&A). Never log tokens; never put secrets in `VITE_*`.

**Why it matters in ShopSphere.** User-generated content (reviews, questions, names) is displayed to others.

**Library/API.** `DOMPurify` (if you ever render HTML), CSP (backend/hosting header), `rel="noopener noreferrer"`, URL validation (`new URL()`), `Content-Security-Policy` basics, `npm audit`.

**Hands-on task.** Write a **security checklist** for the frontend in `docs/security.md` and verify each item: no `dangerouslySetInnerHTML` (or sanitized), external links have `rel`, image URLs from users are validated, no tokens in console/URL, `npm audit` reviewed, and a plan for CSP (what would you allow? Razorpay script, Google fonts?, images CDN, API origin). Try to break your own app with `<img src=x onerror=alert(1)>` in a review body: React must render it as text.

**Acceptance criteria**
- [ ] The XSS probe renders as inert text everywhere.
- [ ] Checklist has 10+ verified items.
- [ ] You can name three ways XSS could still reach React apps.

**Resources.** OWASP XSS prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html · MDN CSP: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP · React `dangerouslySetInnerHTML` warning: https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html

### Checkpoint: explain it without notes (Stage 10)
1. Why is the access token in memory and the refresh token in an httpOnly cookie? What does each protect against, and what remains exposed?
2. What is refresh-token rotation and why does a double refresh at startup log you out?
3. How do you make 6 parallel 401s produce one refresh?
4. Why must `from` be validated? Give an attack.
5. Why is client-side role gating not security?
6. What happens to the Query cache at logout and why?
7. Describe the Google OAuth redirect sequence and who holds the secret.

**Tag:** `git tag stage-10-done`.

---

## Stage 11: Commerce flows

| | |
| --- | --- |
| **Guide stage** | Applies stages 4 to 8 in combination |
| **Needs** | **B4** coupons/deals, **B5** orders, **B6** payments, **B7** reviews/Q&A/uploads, **B8** search/recs/recently-viewed, **B9** notifications/tracking. Ask Claude for each phase **just before the topic that needs it** (listed per topic) |
| **Time** | 3 weeks (the largest stage; ship topic by topic) |
| **Branch prefix** | `s11/` |
| **Pages** | `/cart` (final), `/checkout/*` (final), `/checkout/success/:id`, `/orders`, `/orders/:id` (tracking/cancel/return/invoice), `/deals`, PDP (reviews, Q&A, offers), home personalization, notifications bell, account pages |

### 11.1 Cart finishing: save for later, merge, stock and price changes (B3, B4 partial)

**Concept.** The cart must reflect reality at checkout time: prices may have changed, items may be out of stock, coupons may expire. **Revalidate** the cart on entering checkout.

**Why it matters in ShopSphere.** Selling something you cannot deliver, or at a stale price, is the cost of a naive cart.

**Library/API.** Query (`cart` key), mutation invalidation, `select` to derive banners, `useIsMutating`.

**Hands-on task.** Add a `CartIssues` banner listing lines with `outOfStock`, `qtyReduced`, `priceChanged` flags returned by the API after a **revalidate** call (`GET /cart?validate=true` or the endpoint Claude documents). Block "Proceed to checkout" until acknowledged/resolved. "Saved for later" section with move back. Show "You save ₹X on this order" and the free-shipping progress.

**Acceptance criteria**
- [ ] Changing a product's stock in Mongo Express to 0 flags the line within one refetch and blocks checkout.
- [ ] A price change shows "Price changed from ₹a to ₹b".
- [ ] Moving between cart and saved lists is optimistic and rollback-safe.

**Resources.** (Query docs from Stage 9) · Baymard cart usability research: https://baymard.com/blog/cart-abandonment-rate

### 11.2 Coupons and deals (B4)

**Concept.** Coupons are validated and applied **server-side** against the cart; the client displays the result and the reason for rejection. Flash-sale deals have start/end times and limited stock; the server clock is the authority.

**Why it matters in ShopSphere.** A wrong coupon rule on the client is fraud; a wrong countdown is an angry customer.

**Library/API.** `useMutation` for apply/remove coupon, `useQuery` for available coupons and deals, `useCountdown` + server offset, `refetchInterval` for the "claimed" bar.

**Hands-on task.**
1. Coupon box in cart and checkout review: applying shows discount breakdown; invalid reasons mapped to messages (`EXPIRED`, `MIN_ORDER`, `ALREADY_USED`, `NOT_APPLICABLE`); a "Available coupons" list with one-click apply.
2. `/deals` page: active deals grid, category filter, `FlashSaleStrip` now backed by `GET /deals`, with `useServerTimeOffset` calling the API's time endpoint once and on tab refocus; claimed progress bar polls every 15 s; at `endsAt` the card flips to "Ended" and the price reverts (the API is authoritative: refetch on expiry).
3. Deal badge and crossed-out price on cards wherever a deal applies (rails, search, PDP).

**Acceptance criteria**
- [ ] Applying/removing a coupon updates totals consistently in cart, drawer and checkout without full reloads.
- [ ] Changing your OS clock by +10 minutes does not alter countdown accuracy (server offset).
- [ ] When a deal ends mid-session, the UI refetches and shows the non-deal price; the checkout total matches the server.
- [ ] Every error code has human copy; no raw codes shown.

**Stretch.** Confetti or highlight animation on successful coupon (respecting reduced motion).

**Resources.** Page Visibility: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API · Query polling: https://tanstack.com/query/latest/docs/framework/react/reference/useQuery

### 11.3 Place order (B5)

**Concept.** Placing an order is a **non-idempotent** command with serious consequences. Protect it: disable during submit, send an **idempotency key** (generated once per checkout attempt, e.g. `crypto.randomUUID()`) so retries do not create duplicates, handle 409 (stock changed) and 402/422 (payment/validation) distinctly, and navigate with `replace` on success.

**Why it matters in ShopSphere.** Double orders and double charges.

**Library/API.** `useMutation` with `mutationFn` adding an `Idempotency-Key` header, `crypto.randomUUID()`, `useNavigate({ replace })`, cart invalidation, Query `setQueryData` for the created order.

**Hands-on task.** Implement the Review step "Place order": for **COD** create the order directly; for **online payment** (11.4) create an order in `pending_payment`. Show a summary of items, address snapshot, delivery slot, totals, coupon. On success, clear the cart cache, the checkout draft, and show `/checkout/success/:orderId` (order number, ETA, "Track order" CTA, Mailpit email check). Handle: stock conflict (return to cart with message), session expired mid-checkout (login and resume), network failure (safe retry with same idempotency key).

**Acceptance criteria**
- [ ] Double-clicking "Place order" creates exactly one order (verify in Mongo Express).
- [ ] Retry after a network failure with the same key does not duplicate.
- [ ] Browser Back from the success page does not return to the payment step.
- [ ] The confirmation page works on refresh (loads the order by id; protected).
- [ ] The order email appears in Mailpit.

**Stretch.** Show "Order placed" even if the response is lost, by looking up the latest order by idempotency key on retry.

**Resources.** Idempotency keys (concept): https://stripe.com/docs/api/idempotent_requests · MDN `crypto.randomUUID`: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID

### 11.4 Razorpay checkout (B6): the payment flow

**Concept.** The browser **never decides** that a payment succeeded. The flow: (1) your backend creates a Razorpay **order** (amount, receipt) and returns `razorpayOrderId` + the public `key_id`; (2) the browser loads `checkout.js` and opens the Razorpay modal with `order_id`; (3) on success Razorpay returns `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature` to your `handler`; (4) you send these to your backend, which verifies the **HMAC-SHA256 signature** with the secret; (5) the backend **webhook** (`payment.captured` / `payment.failed`) is the final source of truth and updates the order. The frontend then **polls the order** until it leaves `pending_payment`. Test mode uses test keys and test cards; no real money moves.

**Why it matters in ShopSphere.** A "success" callback can be lost (closed tab) or forged; only the server-verified state counts.

**Library/API.** `https://checkout.razorpay.com/v1/checkout.js` (script injected on demand), `new window.Razorpay(options)` with `key`, `amount`, `currency`, `name`, `order_id`, `prefill`, `theme`, `handler`, `modal.ondismiss`, `rzp.on("payment.failed", cb)`, `rzp.open()`. A typed `useRazorpay()` hook (script loader with a single-flight promise, global type declarations), `useMutation`, `useQuery` with `refetchInterval` for order status.

**Hands-on task.**
1. Create a Razorpay account (test mode needs no KYC), generate **test** keys, give them to Claude's backend `.env` (never to the frontend). Read Claude's B6 docs for endpoints and the local webhook simulation (webhooks cannot reach `localhost` without a tunnel; Claude's B6 includes a script/endpoint to simulate or documents a tunnel).
2. `useRazorpay()`: loads the script once, returns `{ open(options), ready, error }`, with types in `types/razorpay.d.ts`.
3. Payment step: Razorpay vs COD radio; "Pay ₹X" opens the modal prefilled with the user's name/email/phone.
4. Handle every path: success -> verify mutation -> navigate to polling "Confirming your payment..." view; **dismissed** (user closed modal) -> order stays `pending_payment`, show "Payment not completed" with **Retry payment** (reuse the same server order); **failed** (`payment.failed`) -> show reason and retry/COD fallback; **verify mismatch** -> error and support message; **pending** -> poll up to N minutes.
5. Add `/account/payments` listing payments (status, method, amount, refund).

**Acceptance criteria**
- [ ] With the Razorpay test card (see the test card list in docs), the order moves `pending_payment -> placed` and the UI follows by polling, not by trusting the handler.
- [ ] Closing the modal leaves a retryable order; retrying works without duplicating the order.
- [ ] A failed-payment test card (from the docs) shows the failure reason and offers retry.
- [ ] Closing the tab right after paying, then reopening `/orders/:id`, shows the correct final status (webhook-driven).
- [ ] The script loads once even with StrictMode and re-opens; no key secrets appear in the bundle (search the built `build/client` for `rzp_` secrets: only the public `key_id` may appear).
- [ ] You can draw the sequence diagram from memory including where the signature is verified.

**Stretch.** Support UPI intent/QR on mobile and wallet options via Razorpay's options; add a refund display after cancel.

**Common mistakes / observe in DevTools**
- Calling the success handler the proof of payment and showing "Paid" without server verification.
- Loading `checkout.js` on every render or every checkout step.
- Creating a new Razorpay order on every retry (orphaned orders).
- **Network tab:** watch the `razorpay.com` requests, your `verify` call, and the polling stop condition.

**Resources.** Razorpay Standard Checkout (web integration): https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/ · Test cards and payment details: https://razorpay.com/docs/payments/payments/test-card-details/ · Webhooks: https://razorpay.com/docs/webhooks/ · Signature verification (in the integration guide above) · API keys: https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/

### 11.5 Orders: tracking timeline, cancel, return/refund, invoice (B5, B9)

**Concept.** The order page is a **state machine view**: status drives which actions exist (cancel only before shipping; return only after delivery within the window). A timeline renders `statusHistory`. Downloads of authenticated files cannot use a plain `<a href>` (no `Authorization` header): fetch a **blob**, create an object URL, trigger download, revoke.

**Why it matters in ShopSphere.** Post-purchase experience drives repeat purchases and support load.

**Library/API.** Your `OrderStatus` union and `canCancel/canReturn`, `useMutation`, RHF `useFieldArray` for choosing return items/quantities, `ImageDropzone`, `fetch` + `response.blob()`, `URL.createObjectURL`, `Content-Disposition` filename parsing, `<ol>` with `aria-current`.

**Hands-on task.**
1. `/orders/:orderId`: items, address snapshot, payment info, price breakdown, **tracking timeline** (done/current/upcoming steps, timestamps, "Out for delivery" highlight, ETA), refetch every 10 s while active (switches to sockets in 11.9).
2. **Cancel** dialog with reasons, optimistic status change with rollback; show refund status for paid orders.
3. **Return request** (delivered orders inside the window): select items + qty (`useFieldArray`), reason, comments, photos, pickup address; submit; show return status timeline.
4. **Invoice**: "Download invoice" button, with loading state and error handling.
5. **Reorder**: "Buy again" adds all items to cart and reports unavailable ones.
6. Orders list: status chips in URL, search, infinite loading, empty state.

**Acceptance criteria**
- [ ] Buttons shown/hidden strictly via `canCancel/canReturn(status)`; the API also rejects invalid transitions (test with curl) and the UI shows its error.
- [ ] Timeline is an ordered list with accessible current-step marker, and reads sensibly with a screen reader.
- [ ] Invoice downloads with the right filename and the object URL is revoked.
- [ ] Cancelled paid orders show refund progress.
- [ ] Return form validates quantities (cannot exceed purchased) and photos (size/type).

**Resources.** MDN Blob: https://developer.mozilla.org/en-US/docs/Web/API/Blob · `Content-Disposition`: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Disposition · ARIA ordered list pattern: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol

### 11.6 Reviews, ratings and Q&A (B7)

**Concept.** Reviews are user-generated content: rating histogram, sort/filter, pagination, photos, helpful votes, verified-purchase badge, moderation, and rules (one review per user per product; editable). Q&A is a threaded list with answers.

**Why it matters in ShopSphere.** Reviews and ratings are the main trust and conversion drivers on a PDP.

**Library/API.** `useInfiniteQuery` (reviews), `useMutation` with optimistic helpful votes, RHF + Zod (`reviewSchema`), `ImageDropzone`, a `RatingHistogram` computed from API counts, `Intl.RelativeTimeFormat`.

**Hands-on task.** On the PDP: summary (average, count, histogram bars that filter by star on click), sort (most helpful, newest, highest, lowest), photo reviews filter, list with "Verified purchase" badge and photo lightbox, "Helpful (n)" optimistic vote (login required: redirect with intent), "Write a review" dialog (only if allowed per API; show reason otherwise), edit/delete own review. After submit, update `ratingAvg`/`ratingCount` on the product (invalidate precisely: `productKeys.detail(slug)` and `reviewKeys.list(productId)`). Q&A: ask a question, list answers, upvote, seller badge.

**Acceptance criteria**
- [ ] Filter/sort live in the URL (`?reviews=4&rsort=helpful`) and survive refresh.
- [ ] A user cannot double-submit or double-vote; UI reflects server rules.
- [ ] Photo upload shows previews, progress and handles failure per file.
- [ ] XSS probe in a review body renders as plain text (Stage 10.9).
- [ ] Layout does not shift as reviews load (skeletons with reserved height).

**Stretch.** Review summary generation: "What customers say" (AI, optional, behind a feature flag); consider moderation implications.

**Resources.** Query infinite + mutations (Stage 9 links)

### 11.7 Search autocomplete and facets, the finished version (B8)

**Concept.** Autocomplete is a **combobox**: typing fetches suggestions (products, categories, brands, recent searches), arrow keys move the active option, Enter selects, Escape closes, screen readers hear the active option via `aria-activedescendant`. Suggestions are cancellable and debounced, and the request key includes the debounced query so Query caches repeated terms.

**Why it matters in ShopSphere.** Search is the primary entry point; autocomplete quality directly changes conversion.

**Library/API.** `GET /search/suggest?q=`, `useQuery` with `enabled: debounced.length >= 2`, `placeholderData: keepPreviousData`, base-ui `Combobox`/`Autocomplete` (or your own ARIA 1.2 combobox), `localStorage` recent searches (`useLocalStorage`), highlight matches (split text with a safe helper, no `dangerouslySetInnerHTML`).

**Hands-on task.** Replace the Stage 4 search box internals with a Query-based combobox: grouped suggestions (Products / Categories / Brands / Recent), match highlighting, thumbnails, keyboard + pointer + touch, "Search for 'x'" fallback row, recent searches with clear. Selecting a category/brand jumps to the filtered listing; Enter goes to `/products?search=x`. Add "Did you mean" if the API returns a correction.

**Acceptance criteria**
- [ ] Debounce + cancel + cache: typing "sams", "samsu", "samsung" and back to "sams" produces no duplicate requests for cached terms (DevTools).
- [ ] Fully operable by keyboard; VoiceOver announces option count and active option.
- [ ] No flicker of the dropdown between keystrokes (`keepPreviousData`).
- [ ] Recent searches persisted, de-duplicated, capped at 8, and clearable.

**Stretch.** Search analytics event (queries with zero results) logged to the API for the admin dashboard.

**Resources.** ARIA combobox pattern: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/ · Base UI Autocomplete/Combobox: https://base-ui.com/react/components/combobox · Query `keepPreviousData` (9.3 links)

### 11.8 Recently viewed and recommendations (B8)

**Concept.** Personalization rails: server **recently viewed** (merged with the guest local list), **similar products**, **"customers also bought"**, **recommended for you**. Load rails lazily (only when scrolled near) to protect LCP and server load.

**Why it matters in ShopSphere.** Rails raise average order value and bring people back.

**Library/API.** `useQuery` with `enabled` flipped by an `IntersectionObserver` hook (`useInView`), `POST /me/recently-viewed` fire-and-forget mutation on PDP view (debounced, de-duplicated), skeleton rails, scroll-snap carousels (`overflow-x-auto snap-x`), keyboard-accessible scrolling buttons.

**Hands-on task.** Build a generic `ProductRail({ title, queryOptions })`. Add rails: Recently viewed (guest local + server for users), Similar (PDP), Customers also bought (PDP), Recommended for you and Trending (home). Track a view only after the user stays 3 s on the PDP.

**Acceptance criteria**
- [ ] Rails below the fold do not fetch until near viewport (Network tab proves).
- [ ] A rail with an error/empty result renders nothing or a compact message and never breaks the page.
- [ ] Guest list merges into server on login (10.8) and the rail shows the union, de-duplicated.
- [ ] Rail is keyboard scrollable and does not trap focus.

**Stretch.** Impression/click tracking events (`navigator.sendBeacon`) for recommendation CTR.

**Resources.** IntersectionObserver: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API · `sendBeacon`: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon · CSS scroll snap: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll_snap

### 11.9 Real-time notifications and live tracking (B9)

**Concept.** A **WebSocket** keeps a connection open so the server can push. **Socket.io** adds auto-reconnect, rooms, acknowledgements and fallbacks. The client creates **one** socket, authenticates in the handshake (`auth: { token }`), listens for events (`notification:new`, `order:status`), and updates the Query cache (`setQueryData`/`invalidateQueries`) so UI stays in one data flow.

**Why it matters in ShopSphere.** The bell icon and live order timeline are "alive" features; they are also a notorious source of duplicate listeners and leaked connections in React.

**Library/API.** `socket.io-client`: `io(url, { auth, withCredentials, autoConnect: false })`, `socket.on/off/emit`, `socket.connect()/disconnect()`, `connect_error` (token expired -> refresh and reconnect), `useEffect` cleanup, `queryClient`.

**Hands-on task.**
1. `lib/socket.ts`: a lazily created singleton `socket` with `autoConnect: false`; `auth` as a callback so reconnects send the *current* access token.
2. `useSocketConnection()` in the authenticated shell: connect when `status === "authenticated"`, disconnect on logout; handle `connect_error` with auth errors by refreshing then reconnecting; StrictMode-safe.
3. `useSocketEvent(event, handler)` hook with proper `on/off` cleanup (use `useEffectEvent` or a ref to avoid re-subscribing on every handler change).
4. **Notification bell**: unread count badge (from `GET /notifications/unread-count`), dropdown (base-ui `Popover`/`Menu`) with latest 10, mark read on click, "Mark all read", link to `/account/notifications` (full list, infinite, filters, preferences toggles). New socket events prepend and bump the badge, plus a Sonner toast.
5. **Live tracking**: on `/orders/:id`, `order:status` events patch `orderKeys.detail(id)` and the timeline animates the new step; keep the polling from 9.10 as a **fallback** only when disconnected.
6. Connection status indicator (dev) and offline handling.

**Acceptance criteria**
- [ ] Exactly **one** socket connection exists (check DevTools Network > WS and the server logs), even across navigation and StrictMode.
- [ ] Logging out disconnects; logging in as another user does not receive the previous user's events.
- [ ] Changing an order status via the admin/Mongo/API shows the new step live in under 2 s without refresh.
- [ ] Killing and restarting the backend: the client reconnects automatically, refetches missed data, and the bell is consistent.
- [ ] Listeners are removed on unmount (no duplicate toasts after navigating around).
- [ ] Notification dropdown is keyboard accessible and announces new notifications politely.

**Stretch.** Typing indicator-style presence: "2 others are viewing this deal" using a room.

**Common mistakes / observe in DevTools**
- Registering `socket.on` in an effect without `off` (duplicate toasts after each navigation).
- Creating `io()` inside a component (a new connection per render).
- Stale token on reconnect.
- **DevTools > Network > WS:** inspect frames (the Socket.io protocol: `42[...]` event frames), ping/pong, reconnect timing.

**Resources.** Socket.io client API: https://socket.io/docs/v4/client-api/ · Client initialization: https://socket.io/docs/v4/client-initialization/ · Using Socket.io with React lifecycle (listeners): https://socket.io/how-to/use-with-react · MDN WebSocket: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API

### 11.10 Home, PDP and account completion

**Concept.** Assembly: the home page and PDP are compositions of many independently loaded, independently failing sections.

**Why it matters in ShopSphere.** This is where architecture pays or fails: if each section is a self-contained feature component with its own query, the page is easy to evolve.

**Library/API.** Everything so far; carousel (Embla via shadcn `carousel`, or your own), `useInView`, `meta` per route.

**Hands-on task.**
- **Home:** hero banner carousel (autoplay, pause on hover/focus and when `prefers-reduced-motion`, swipe, dots, `aria-roledescription="carousel"`), mega-menu from `GET /categories`, deals rail (flash sale), Recently viewed, Recommended, Trending, brand strip, "Top categories".
- **PDP:** offers panel (bank/coupon offers from API), delivery check (7.6, now real endpoint if available), share/copy link, compare toggle, sticky buy box on desktop and sticky bottom bar on mobile, breadcrumbs, specs/description tabs, reviews, Q&A, similar.
- **Account:** `/account/profile` (RHF + avatar upload), `/account/addresses` (final), `/account/notifications` preferences, `/account/payments`.

**Acceptance criteria**
- [ ] Each section has its own loading/error/empty handling and an `aria-labelledby` heading.
- [ ] Hero carousel is operable by keyboard and does not autoplay for reduced-motion users.
- [ ] Mobile PDP has a sticky "Add to cart / Buy now" bar that does not cover content or the keyboard-focused fields.
- [ ] Throttled Slow 4G: above-the-fold content renders first; below-the-fold rails load on demand.

**Resources.** Embla carousel: https://www.embla-carousel.com/ · shadcn carousel: https://ui.shadcn.com/docs/components/carousel · WAI carousel pattern: https://www.w3.org/WAI/ARIA/apg/patterns/carousel/

### Checkpoint: explain it without notes (Stage 11)
1. Why can the Razorpay `handler` callback not be trusted as proof of payment? What is?
2. How does an idempotency key prevent double orders on retry?
3. Which states allow cancel/return and where is that rule enforced (UI and API)?
4. How do socket events, Query cache and polling cooperate without duplication?
5. Why does the socket auth use a callback, and what happens on token expiry?
6. How do you merge a guest cart without losing items or exceeding stock?
7. Walk through the autocomplete request pipeline from keypress to rendered option.

**Tag:** `git tag stage-11-done`.

---

## Stage 12: Quality: testing, debugging, accessibility

| | |
| --- | --- |
| **Guide stage** | 7 Quality, Debugging and Performance: React Testing Fundamentals, Browser and React DevTools |
| **Needs** | none new (**B12** hardening helps e2e determinism but is not required). Needs a reset-and-seed command: `npm run db:reset && npm run seed` in `/backend` |
| **Time** | 2 weeks |
| **Branch prefix** | `s12/` |
| **Pages** | all of them, now verified; no new features |

You will test what you built, so you learn what makes code testable (and refactor the parts that are not). The test mindset: **test behaviour the user can observe, not implementation details.**

### 12.1 Test strategy and Vitest setup; pure-function tests first

**Concept.** Testing pyramid: many fast **unit** tests (pure functions, reducers, hooks), a fair number of **component/integration** tests (React Testing Library with a mocked network), a few **end-to-end** tests (real browser, real backend). Vitest is Vite-native: same config, ESM, TypeScript, fast watch mode, Jest-compatible API.

**Why it matters in ShopSphere.** Money logic (totals, coupons, stock clamps), URL parsing and reducers are pure and critical. Test them exhaustively, cheaply.

**Library/API.** `vitest` (`describe`, `it`, `expect`, `vi`), `jsdom` environment, `@testing-library/jest-dom/vitest`, `@vitest/coverage-v8`, `test` block in `vite.config.ts` (`environment: "jsdom"`, `setupFiles`, `globals`, `css: false`), scripts `test`, `test:watch`, `test:coverage`.

**Hands-on task.** Install and configure Vitest (keep the React Router plugin out of the test config if it interferes: use a dedicated `vitest.config.ts` with `resolve.alias` for `@`). Write tests for: `computeTotals` (coupon edges: `maxDiscount`, `minOrder`, rounding), `filterProducts`/`sortProducts`/`priceHistogram` (empty, single-price), `parseFilters`/`toSearchParams` (garbage input), status helpers (`canCancel` for every status via `it.each`), Zod schemas (valid/invalid tables), reducers, `safeRedirect` (open-redirect attempts), `formatCurrency`.

**Acceptance criteria**
- [ ] `npm test` passes in < 10 s; `npm run test:coverage` reports >= 90% for the pure-logic folders.
- [ ] Table-driven tests (`it.each`) used for rule-heavy functions.
- [ ] At least one test failed first (write the test, see it fail, then make it pass) so you know it can fail.
- [ ] You found at least one real bug through testing and fixed it (note it).

**Resources.** Vitest guide (from your guide): https://vitest.dev/guide/ · Vitest config: https://vitest.dev/config/ · Vitest coverage: https://vitest.dev/guide/coverage · Testing Library intro (from your guide): https://testing-library.com/docs/react-testing-library/intro/ · Kent C. Dodds "Testing implementation details": https://kentcdodds.com/blog/testing-implementation-details

### 12.2 Component tests with React Testing Library and user-event

**Concept.** RTL renders a component into jsdom and gives you queries that mirror how users and assistive tech find things: `getByRole` (preferred), `getByLabelText`, `getByText`, `getByPlaceholderText`, with `findBy*` for async and `queryBy*` to assert absence. `userEvent.setup()` simulates real interaction sequences (focus, keydown, input, blur) better than `fireEvent`. If a test is hard to write with `getByRole`, your markup probably has an accessibility problem.

**Why it matters in ShopSphere.** The stepper, variant picker, filters, forms and drawers are interaction-heavy.

**Library/API.** `@testing-library/react` (`render`, `screen`, `within`, `waitFor`, `waitForElementToBeRemoved`), `@testing-library/user-event` v14 (`const user = userEvent.setup(); await user.click(...)`), `@testing-library/jest-dom` matchers (`toBeInTheDocument`, `toBeDisabled`, `toHaveAccessibleName`), a `renderWithProviders` helper in `app/test/render.tsx` (fresh `QueryClient` per test with `retry: false`, router stub, theme/auth providers). For route-aware components use React Router's `createRoutesStub` / `MemoryRouter`.

**Hands-on task.** Write tests for: `QuantityStepper` (min/max/clamp/keyboard), `VariantPicker` (disabled combinations, derived price), `ProductCard` (out of stock, wishlist button, link target), `FilterSidebar` (checking a brand updates the URL: assert via a router stub that reads location), `LoginForm` (empty submit shows errors with focus on first invalid field; password mismatch), `AddressForm` (edit mode prefill), `CartDrawer` (open, remove, undo toast).

**Acceptance criteria**
- [ ] Queries use `getByRole`/`getByLabelText` for at least 80% of lookups; no `container.querySelector`, no CSS-class assertions.
- [ ] No test depends on implementation details (state variables, hook internals).
- [ ] Each test file runs in isolation and in parallel.
- [ ] One test you wrote exposed a missing label or role; you fixed the component.

**Resources.** RTL queries priority: https://testing-library.com/docs/queries/about/#priority · user-event: https://testing-library.com/docs/user-event/intro · jest-dom: https://github.com/testing-library/jest-dom · Common RTL mistakes: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library · RR testing with `createRoutesStub`: https://reactrouter.com/start/framework/testing

### 12.3 Testing hooks and timers

**Concept.** Test hooks with `renderHook` (and `act` for state updates). For time-dependent hooks use **fake timers** (`vi.useFakeTimers()`, `vi.advanceTimersByTime(ms)`, `vi.setSystemTime(...)`) so tests are instant and deterministic.

**Why it matters in ShopSphere.** `useDebounce`, `useCountdown`, `useLocalStorage`, `useMediaQuery` have time and environment dependencies that are painful to test manually.

**Library/API.** `renderHook`, `act`, `rerender`, `unmount`, `vi.useFakeTimers`, `vi.spyOn(window, "matchMedia")`, mocking `localStorage`.

**Hands-on task.** Tests for: `useDebounce` (value settles only after delay; last value wins; cleanup on unmount), `useCountdown` (ticks, expires at zero, server offset applied, interval cleared on unmount), `useLocalStorage` (corrupt JSON, cross-tab `storage` event), `useRazorpay` script loader (single script tag across calls).

**Acceptance criteria**
- [ ] No real `setTimeout` waits in tests (fake timers only).
- [ ] You assert the interval is cleared on unmount (spy on `clearInterval` or `vi.getTimerCount()`).
- [ ] A bug in your hook found by a test is fixed.

**Resources.** Vitest fake timers: https://vitest.dev/guide/mocking/timers · `renderHook`: https://testing-library.com/docs/react-testing-library/api/#renderhook

### 12.4 Mocking the network with MSW

**Concept.** **Mock Service Worker (MSW 2)** intercepts requests at the network level, so your real `fetch` + API client + Query code runs unchanged. You declare handlers like a tiny backend: `http.get("http://localhost:4000/api/v1/products", () => HttpResponse.json({ success: true, data: ... }))`. In tests use `setupServer` from `msw/node`; override per-test with `server.use(...)`.

**Why it matters in ShopSphere.** Tests cover loading, success, empty, 4xx and 5xx responses deterministically, including the failure paths that are hard to trigger by hand (rate limit, 409 stock conflict, 401 refresh).

**Library/API.** `msw`: `http`, `HttpResponse`, `delay`, `setupServer`, `server.listen({ onUnhandledRequest: "error" })`, `server.resetHandlers()`, `server.close()`; the same handlers can run in the browser with `setupWorker` for offline development (optional).

**Hands-on task.** Create `app/test/msw/handlers.ts` with default happy handlers for products, categories, cart, wishlist, auth (`refresh`, `me`), orders; `app/test/setup.ts` wiring server lifecycle. Write integration tests: (1) listing shows skeleton then products; empty result state; 500 error with retry succeeding the second time (use `server.use` once-handler); (2) wishlist optimistic toggle rolls back on 500; (3) auth: 401 then refresh then retry produces one refresh with 3 parallel calls (counting handler hits); (4) address creation server validation error maps to the field; (5) coupon invalid code messages.

**Acceptance criteria**
- [ ] `onUnhandledRequest: "error"` is on; any unmocked call fails the test loudly.
- [ ] Tests never hit the real backend.
- [ ] Failure paths (500, 409, 401, network error via `HttpResponse.error()`) each have at least one test.
- [ ] The single-flight refresh test asserts exact call counts.

**Resources.** MSW docs: https://mswjs.io/docs/ · MSW quick start: https://mswjs.io/docs/quick-start · Node integration: https://mswjs.io/docs/integrations/node · TkDodo "Testing React Query": https://tkdodo.eu/blog/testing-react-query

### 12.5 Integration tests of whole flows

**Concept.** Integration tests render a feature (or the routed app) with real providers and mocked network, and walk a user journey. They give the best confidence per line of test code.

**Why it matters in ShopSphere.** The bugs that hurt are between units: search -> filter -> URL -> query -> render; add to cart -> drawer -> totals.

**Library/API.** `createRoutesStub` or `createMemoryRouter` with your real route modules, `renderWithProviders`, MSW, `userEvent`.

**Hands-on task.** Write five journey tests: (1) search "phone", filter brand and price, sort, assert URL, results and chips; (2) PDP: pick variant, change qty, add to cart, badge updates, drawer shows line; (3) guest tries checkout -> redirected to login -> logs in -> lands on checkout; (4) multi-step checkout form (validation per step, Back keeps data); (5) order detail: cancel flow with confirm dialog and rollback on failure.

**Acceptance criteria**
- [ ] Each journey < 2 s and not flaky over 20 consecutive runs (`vitest --repeat`/loop in shell).
- [ ] No arbitrary `sleep`; every async wait is a `findBy*`/`waitFor` on user-visible output.

**Resources.** Testing Library guiding principles: https://testing-library.com/docs/guiding-principles/ · Async utilities: https://testing-library.com/docs/dom-testing-library/api-async/

### 12.6 End-to-end tests with Playwright

**Concept.** Playwright drives real Chromium/Firefox/WebKit against the running stack. It auto-waits for actionability, offers resilient locators (`getByRole`), network interception, tracing (screenshots + DOM snapshots + network on failure), and parallel isolated contexts.

**Why it matters in ShopSphere.** The critical revenue path (browse -> cart -> login -> checkout -> order) must be proven against the real API and DB.

**Library/API.** `@playwright/test`: `test`, `expect`, `page.goto`, `getByRole/getByLabel/getByText`, `expect(page).toHaveURL`, `storageState` (reuse login), `webServer` config (start frontend + backend), `test.beforeAll` for DB reset via API/script, `route.fulfill`/`route.abort` to simulate failures, `npx playwright test --ui`, `npx playwright codegen`, `npx playwright show-trace`, `frameLocator` for payment iframes.

**Hands-on task.** Install Playwright; `playwright.config.ts` with `baseURL: "http://localhost:5173"`, `webServer` entries (`reuseExistingServer: !process.env.CI`), `trace: "on-first-retry"`. Seed deterministic data (`npm run db:reset && npm run seed` in global setup). Specs: (1) guest browses/searches/filters; (2) register -> verify (read the link from Mailpit's API at `http://localhost:8025/api/v1/messages`) -> login; (3) **checkout with COD end to end** and assert the order appears in `/orders`; (4) simulated 500 on products shows error state and retry; (5) mobile viewport project (iPhone profile) for the cart drawer; (6) **Razorpay**: do not automate the real iframe in CI; instead intercept the order/verify endpoints with `page.route` to test your UI states (success, dismissed, failed), and do the real test-card payment manually once.

**Acceptance criteria**
- [ ] `npx playwright test` is green locally 3 times in a row; no fixed `waitForTimeout`.
- [ ] Failed test produces a trace you can open and read.
- [ ] Specs use roles/labels not CSS selectors; a `LoginPage`-style page object or helper functions exist for repeated flows.
- [ ] Auth state is reused via `storageState` for logged-in specs (login UI is tested once).
- [ ] The suite runs headless in under 3 minutes.

**Resources.** Playwright intro: https://playwright.dev/docs/intro · Locators: https://playwright.dev/docs/locators · Trace viewer: https://playwright.dev/docs/trace-viewer · Authentication: https://playwright.dev/docs/auth · Network mocking: https://playwright.dev/docs/mock · webServer: https://playwright.dev/docs/test-webserver

### 12.7 Debugging drills: DevTools, React DevTools, systematic method

**Concept.** Debugging is a method: **reproduce -> isolate -> hypothesize -> verify -> fix -> prevent (test)**. Use the right tool for the symptom: Console/stack trace (exceptions), Network (data/contract), Elements/Computed (layout), Sources breakpoints (logic), React DevTools Components (props/state/hooks), Profiler (renders), Performance (jank), Application (storage/cookies/service worker).

**Why it matters in ShopSphere.** Independent engineers investigate before asking for help (your guide's goal).

**Library/API.** Chrome/Firefox DevTools: breakpoints (line, conditional, DOM mutation, XHR/fetch, event listener), blackboxing, `debugger`, `$0`, `copy(obj)`, `console.table`, request blocking, local overrides, throttling; React DevTools (edit hooks state, "Suspend" component, "Inspect the matching DOM element"); source maps.

**Hands-on task.** **Bug-hunt**: ask Claude to create a branch `bug-hunt` with **8 injected bugs** of varied kinds (stale closure, missing key, wrong dependency array, unhandled 4xx, race condition, memory leak from a missing cleanup, layout shift, wrong cache key causing stale data) without telling you which. You must find each using tools, write a note (symptom, tool used, root cause, fix, test added). Also drill: set a conditional breakpoint inside a `reduce`; break on `fetch` to see who triggered a request; find a memory leak using the Memory tab (heap snapshots before/after navigating 20 times).

**Acceptance criteria**
- [ ] All 8 bugs found, each with a regression test (unit/RTL) that fails before the fix.
- [ ] Debug log shows which DevTools feature located each.
- [ ] You can demonstrate a conditional breakpoint, a fetch breakpoint, and a heap snapshot comparison live.

**Resources.** MDN DevTools intro (from your guide): https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Tools_and_testing/Cross_browser_testing/Your_first_look_at_the_Browser_DevTools · Chrome DevTools JavaScript debugging: https://developer.chrome.com/docs/devtools/javascript · React DevTools: https://react.dev/learn/react-developer-tools · Memory panel: https://developer.chrome.com/docs/devtools/memory-problems

### 12.8 Error boundaries and resilience

**Concept.** An **error boundary** is a class component (or a library wrapper such as `react-error-boundary`) that catches render errors in its subtree and shows a fallback. It does not catch event handler errors, async errors or SSR errors; those need `try/catch`, Query's `onError`, and global `window.onerror`/`unhandledrejection` listeners.

**Why it matters in ShopSphere.** The reviews widget or recommendations rail failing must not take down the page.

**Library/API.** `react-error-boundary` (`ErrorBoundary`, `useErrorBoundary`, `resetKeys`), RR `ErrorBoundary` exports (Stage 5.7), `QueryErrorResetBoundary`, `window.addEventListener("unhandledrejection")`, your `lib/report.ts`.

**Hands-on task.** Wrap each independent section (reviews, Q&A, rails, mega-menu, notification bell) in a boundary with a compact fallback and retry that resets via `resetKeys`; add global handlers that report to `lib/report.ts`; add a dev-only "Crash this widget" switch; write RTL tests that a thrown error renders the fallback and that Retry recovers.

**Acceptance criteria**
- [ ] A thrown error in reviews leaves the rest of the PDP interactive.
- [ ] Unhandled promise rejections and uncaught errors are reported once each.
- [ ] Fallbacks are accessible (`role="alert"`, focusable retry).

**Resources.** Catching rendering errors: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary · react-error-boundary: https://github.com/bvaughn/react-error-boundary · MDN `unhandledrejection`: https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event

### 12.9 Accessibility audit

**Concept.** Accessibility (a11y) is correctness for everyone: keyboard operability, semantics, names/roles/states, focus management, contrast, motion, error identification, and responsive/zoom support. Automated tools (axe) catch roughly a third of issues; the rest need keyboard and screen-reader passes. Target WCAG 2.2 AA.

**Why it matters in ShopSphere.** Legal exposure, SEO overlap, and market reach; also a quality signal.

**Library/API.** `@axe-core/playwright` (`new AxeBuilder({ page }).analyze()`), `vitest-axe` or `jest-axe` for components, axe DevTools extension, Lighthouse a11y, VoiceOver (macOS Cmd+F5), `prefers-reduced-motion`, `:focus-visible`, `aria-*` patterns, WCAG 2.2 checklist.

**Hands-on task.** Audit these pages: home, listing, PDP, cart, checkout (each step), login, account. For each: (1) keyboard-only run (no mouse) completing the task, (2) axe scan in Playwright with zero serious/critical violations, (3) VoiceOver pass on search autocomplete, cart drawer and checkout stepper, (4) contrast check of the theme tokens in light and dark, (5) 200% zoom and 320px reflow, (6) reduced motion. Write `docs/a11y-audit.md` listing issues found and fixed. Add axe checks to e2e for key pages.

**Acceptance criteria**
- [ ] Every interactive element is reachable and operable by keyboard with a visible focus indicator.
- [ ] Dialogs/drawers trap focus, close on Escape and restore focus.
- [ ] No form control without an accessible name; errors are programmatically associated.
- [ ] Axe in CI: zero serious/critical violations on the audited pages.
- [ ] No content is lost at 320px width or 200% zoom.

**Resources.** WCAG 2.2 quick reference: https://www.w3.org/WAI/WCAG22/quickref/ · APG patterns: https://www.w3.org/WAI/ARIA/apg/patterns/ · Playwright accessibility testing: https://playwright.dev/docs/accessibility-testing · axe-core rules: https://dequeuniversity.com/rules/axe/ · WebAIM contrast checker: https://webaim.org/resources/contrastchecker/

### 12.10 Quality gates

**Concept.** Automate the checks you do by hand: format, lint, typecheck, test, build. Fail fast locally (pre-commit) and in CI (Stage 14).

**Why it matters in ShopSphere.** Prevents regressions as the codebase grows and as AI-generated code enters.

**Library/API.** ESLint flat config (`typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`), Prettier, `tsc`, `lint-staged` + `husky` (optional), npm scripts (`check`: lint + typecheck + test).

**Hands-on task.** Add scripts `lint`, `typecheck`, `test`, `check`; enable `jsx-a11y` rules; add pre-commit hook running `lint-staged` (format + lint changed files); document in README.

**Acceptance criteria**
- [ ] `npm run check` runs everything and fails on a deliberately introduced lint/type/test error.
- [ ] A commit with a lint error is blocked locally (or you can explain why you chose not to enable hooks).

**Resources.** typescript-eslint: https://typescript-eslint.io/getting-started/ · jsx-a11y plugin: https://github.com/jsx-eslint/eslint-plugin-jsx-a11y · lint-staged: https://github.com/lint-staged/lint-staged

### Checkpoint: explain it without notes (Stage 12)
1. Why does RTL prefer `getByRole`, and what does a hard-to-query element tell you?
2. How does MSW differ from mocking `fetch` with `vi.fn()`, and why does it give better tests?
3. What belongs in unit vs integration vs e2e for the checkout?
4. Why not automate the real Razorpay iframe in CI, and what do you test instead?
5. How do fake timers make `useCountdown` testable?
6. Name three things axe cannot detect.
7. What does an error boundary not catch?

**Tag:** `git tag stage-12-done`.

---

## Stage 13: Performance and polish

| | |
| --- | --- |
| **Guide stage** | 7 Quality, Debugging and Performance: React Rendering and Optimization Basics (plus polish) |
| **Needs** | **B12** (caching headers, ETags, rate limits, jobs). Ask Claude for B12 at the start. B8 for suggestions already done |
| **Time** | 2 weeks |
| **Branch prefix** | `s13/` |
| **Pages** | all; dark mode, i18n/currency, SEO, PWA, motion |

> **Rule: measure, then optimize, then measure.** Do not optimize anything before you have a number that says it is slow. Keep `docs/perf-log.md` with before/after for each change.

### 13.1 Baseline: Lighthouse, Web Vitals and the Performance panel

**Concept.** Core Web Vitals: **LCP** (Largest Contentful Paint, loading, target <= 2.5 s), **INP** (Interaction to Next Paint, responsiveness, target <= 200 ms), **CLS** (Cumulative Layout Shift, stability, target <= 0.1). Lab data (Lighthouse) is reproducible; field data (real users) is truth. Always test a **production build** (`npm run build` + static preview), never the dev server, with throttling.

**Why it matters in ShopSphere.** Speed correlates with conversion; mobile shoppers on mid-range devices are the baseline.

**Library/API.** Lighthouse (DevTools or CLI), `web-vitals` npm library (`onLCP`, `onINP`, `onCLS`), DevTools Performance panel (CPU 4x throttle + Slow 4G), Performance Insights, `PerformanceObserver`, `performance.mark/measure`.

**Hands-on task.** Create `docs/perf-log.md` with baseline Lighthouse mobile scores and LCP/INP/CLS for home, listing, PDP, cart. Add `web-vitals` reporting: log in dev, and `navigator.sendBeacon` to `POST /metrics/vitals` in prod (endpoint from B12 if available). Identify the LCP element on each page (hero image? first card image?). Record a Performance trace of typing in the filter price input and scrolling the listing; note long tasks.

**Acceptance criteria**
- [ ] Baseline numbers recorded for 4 pages, mobile + desktop.
- [ ] LCP element identified for each page, with a hypothesis for improvement.
- [ ] Vitals reported with page path and connection type.

**Resources.** Web Vitals: https://web.dev/articles/vitals · web-vitals library: https://github.com/GoogleChrome/web-vitals · Lighthouse: https://developer.chrome.com/docs/lighthouse/overview · Performance panel: https://developer.chrome.com/docs/devtools/performance

### 13.2 Render performance: profile, memoize, transitions, Compiler

**Concept.** A render is function execution; slowness comes from rendering too much (wide trees updating), too often (state too high up), or too expensively (heavy computation). Tools: lift state down, split components, `memo`, stable props, `useMemo` for expensive derivations, **`useTransition`** (mark non-urgent updates so typing stays responsive) and **`useDeferredValue`** (render with a lagging copy of a value). **React Compiler** auto-memoizes eligible components at build time; keep code idiomatic (pure render, no mutation) so it can.

**Why it matters in ShopSphere.** Dragging the price slider with 24 to 100 cards re-filtering must stay smooth; typing in the search with a large rail below must not lag.

**Library/API.** React Profiler (flamegraph, ranked, "why did this render"), `memo`, `useMemo`, `useCallback`, `useTransition`, `useDeferredValue`, React Compiler (`babel-plugin-react-compiler`; follow the React docs for Vite setup), `eslint-plugin-react-compiler`/React Compiler rules in `eslint-plugin-react-hooks`.

**Hands-on task.** (1) Profile the filter interaction with 500 products on screen; record render counts. (2) Fix by lifting the slider's transient value into a local state and committing to the URL on release/`useDeferredValue`; wrap result list updates in `startTransition`. (3) Show the results grid dimmed while `isPending`. (4) Enable the React Compiler on a branch; compare Profiler results with and without your manual `memo`/`useCallback`; remove memoization that the compiler makes redundant, keep what is still needed (document why). (5) Record outcomes in the perf log.

**Acceptance criteria**
- [ ] Interaction trace shows INP improvement with numbers (before/after).
- [ ] Typing in search never drops frames while the grid re-renders (transition proof).
- [ ] You can explain what `useTransition` does *not* do (it does not make renders faster; it makes them interruptible and lower priority).
- [ ] Compiler decision recorded: adopted, or not, and why.

**Common mistakes / observe in DevTools**
- Optimizing without a Profiler recording.
- Putting fast-changing state in Context.
- Wrapping everything in `memo` with unstable props (no effect).
- **Profiler:** sort by "self time", enable "Record why each component rendered", compare commit durations.

**Resources.** React Profiler: https://react.dev/reference/react/Profiler · `useTransition`: https://react.dev/reference/react/useTransition · `useDeferredValue`: https://react.dev/reference/react/useDeferredValue · React Compiler: https://react.dev/learn/react-compiler · Render and commit: https://react.dev/learn/render-and-commit

### 13.3 Bundle size and code splitting

**Concept.** JS must be downloaded, parsed and executed; less JS = faster interaction. Route-level splitting is automatic in framework mode; split further for rarely used heavy features (charts, rich editors, lightbox, compare table). Audit dependencies: tree-shakeable imports, avoid moment-sized libs.

**Why it matters in ShopSphere.** A fast home page cannot ship the checkout, Razorpay helpers, charts and the review editor.

**Library/API.** `rollup-plugin-visualizer` or `vite-bundle-visualizer`, `React.lazy`, `import()`, `<Suspense>`, `vite` `build.rollupOptions.output.manualChunks` (rarely needed), `<link rel="modulepreload">`/prefetch on intent.

**Hands-on task.** Generate a bundle treemap; list the 5 largest dependencies; lazy-load: the lightbox/zoom, review editor, compare page, notification popover internals, Motion's heavy features (use `LazyMotion` + `domAnimation`). Prefetch route chunks on link hover (`<Link prefetch="intent">` in framework mode). Verify `lucide-react` icons are imported by name (tree-shaken). Set a size budget.

**Acceptance criteria**
- [ ] Initial JS for `/` reduced by a measured amount (record kB gzip).
- [ ] No dependency > 50 kB gzip without a recorded justification.
- [ ] Lazy chunks show a stable fallback with no layout shift.

**Resources.** Vite build & chunking: https://vite.dev/guide/build · `lazy`: https://react.dev/reference/react/lazy · RR `<Link prefetch>`: https://reactrouter.com/api/components/Link · Bundlephobia: https://bundlephobia.com/ · web.dev code splitting: https://web.dev/articles/reduce-javascript-payloads-with-code-splitting

### 13.4 Virtualizing long lists

**Concept.** Rendering thousands of DOM nodes is slow regardless of React. **Virtualization** renders only the visible rows plus a small overscan.

**Why it matters in ShopSphere.** Order history, notification history, review lists, compare tables and an infinite feed can reach thousands of items.

**Library/API.** `@tanstack/react-virtual`: `useVirtualizer({ count, getScrollElement, estimateSize, overscan })`, `measureElement` for dynamic heights, `getVirtualItems()`, `getTotalSize()`, grid virtualization via rows with `lanes`.

**Hands-on task.** Virtualize the notifications page (seed 2,000 notifications) and the infinite product feed (window virtualization using `useWindowVirtualizer`). Keep keyboard/tab navigation and anchor behavior sane (document trade-offs: find-in-page, accessibility).

**Acceptance criteria**
- [ ] DOM node count stays roughly constant while scrolling 2,000 items (Elements count / Performance monitor).
- [ ] Scroll FPS remains smooth at 4x CPU throttle.
- [ ] Dynamic-height rows measure correctly; no jumping.
- [ ] You can state when *not* to virtualize (short lists; a11y/find-in-page costs).

**Resources.** TanStack Virtual: https://tanstack.com/virtual/latest · Example (dynamic): https://tanstack.com/virtual/latest/docs/framework/react/examples/dynamic · web.dev virtualization: https://web.dev/articles/virtualize-long-lists-react-window

### 13.5 Images, fonts and layout stability

**Concept.** Images dominate bytes and LCP. Serve right-sized modern formats (AVIF/WebP) with `srcset` + `sizes`, set `width`/`height` or `aspect-ratio` (prevents CLS), `loading="lazy"` for below-the-fold, and **eager + `fetchPriority="high"`** for the LCP image. Fonts: self-host (you already use `@fontsource-variable/inter`), `font-display: swap`, preload the critical file, subset if possible.

**Why it matters in ShopSphere.** A product grid of 24 images, a hero banner and a gallery.

**Library/API.** `<img srcSet sizes loading decoding fetchPriority>`, `<picture>` for formats, `aspect-ratio` Tailwind utilities, `placeholder` blur (tiny base64 or dominant color from API), `IntersectionObserver`, CDN transformations (Cloudinary later) or ask Claude's B7 to generate sizes (thumbnail, card, large).

**Hands-on task.** Build `ResponsiveImage` component (props: `src`, `widths`, `sizes`, `priority`, `ratio`, `alt`); use for card, gallery, hero, rails. Make the hero image the prioritized LCP element; lazy the rest. Remove CLS on cards and PDP; measure before/after.

**Acceptance criteria**
- [ ] Network tab shows images appropriately sized for viewport (no 2000px image in a 200px card).
- [ ] CLS <= 0.1 on all four baseline pages; LCP improved (record).
- [ ] Below-the-fold images are not requested until near the viewport.
- [ ] Every image has meaningful `alt` or `alt=""` for decorative ones.

**Resources.** web.dev images: https://web.dev/learn/images · Optimize LCP: https://web.dev/articles/optimize-lcp · `fetchpriority`: https://web.dev/articles/fetch-priority · Optimize CLS: https://web.dev/articles/optimize-cls · MDN responsive images: https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images

### 13.6 Motion and micro-interactions

**Concept.** Motion communicates state change (added to cart, panel opening, list reorder) but must respect `prefers-reduced-motion` and be cheap (animate `transform`/`opacity`, not layout properties).

**Why it matters in ShopSphere.** A polished "add to cart" confirmation and smooth drawer/popover/list transitions are part of a production feel.

**Library/API.** `motion` (formerly Framer Motion): `import { motion, AnimatePresence, useReducedMotion, LazyMotion, domAnimation, m } from "motion/react"`; Tailwind transitions and `tw-animate-css` (already installed) for simple cases.

**Hands-on task.** (1) "Fly to cart" thumbnail from the product image to the cart icon; (2) animated cart count bump; (3) animated list add/remove in cart with `AnimatePresence` and `layout`; (4) skeleton-to-content fade; (5) a reduced-motion variant for all of them (instant state change).

**Acceptance criteria**
- [ ] Animations run at 60 fps at 4x CPU throttle (Performance panel).
- [ ] With "Reduce motion" enabled in OS/DevTools (Rendering > emulate), no non-essential animation plays.
- [ ] No animation blocks interaction or delays the add-to-cart feedback > 300 ms.

**Resources.** Motion for React: https://motion.dev/docs/react · Reduced motion: https://motion.dev/docs/react-accessibility · MDN `prefers-reduced-motion`: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion · web.dev animations guide: https://web.dev/articles/animations-guide

### 13.7 Dark mode, theming and design tokens

**Concept.** Theming = a small set of CSS variables (tokens) with a dark override; Tailwind v4 reads variables defined in `app.css`. Avoid the **flash of wrong theme** by setting the class before first paint (a tiny inline script in the document head).

**Why it matters in ShopSphere.** Users expect dark mode; images, charts and shadows need care.

**Library/API.** `:root` and `.dark` CSS variables, Tailwind `dark:` variant (class strategy as configured by shadcn), `color-scheme`, `prefers-color-scheme`, inline script in `root.tsx` `<head>`, `ThemeProvider` from Stage 8.

**Hands-on task.** Finalize tokens (background, foreground, card, border, brand, success, warning, danger, ring) in `app.css`; system/light/dark toggle with persisted choice; prevent flash via head script; adjust product images (no pure-white backgrounds glaring: use a neutral container), charts and skeletons; verify contrast ratios in both themes.

**Acceptance criteria**
- [ ] No theme flash on hard reload (record screen at 6x slow motion or Performance screenshots).
- [ ] All text/UI meets WCAG AA contrast in both themes.
- [ ] Theme follows OS changes live in `system` mode.
- [ ] Third-party UI (Razorpay modal theme color, Sonner theme) matches.

**Resources.** Tailwind dark mode: https://tailwindcss.com/docs/dark-mode · shadcn dark mode: https://ui.shadcn.com/docs/dark-mode · MDN `color-scheme`: https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme

### 13.8 Internationalization, currency and formatting

**Concept.** i18n is more than translation: locale-aware **numbers, currency, dates, plurals, sorting** and layout direction. The browser's `Intl` API does most of it. Translation strings need a library with interpolation and plural rules.

**Why it matters in ShopSphere.** INR vs USD display, English/Hindi UI strings, `1 item` vs `2 items`, "Delivered 12 Mar" formatting.

**Library/API.** `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, `Intl.PluralRules`, `Intl.ListFormat`; `react-i18next` (`i18next`, `useTranslation`, namespaces, lazy-loaded JSON resources) or `react-intl`; Tailwind logical utilities (`ms-*`, `me-*`, `ps-*`, `text-start`) and `dir` attribute for RTL readiness.

**Hands-on task.** `LocaleProvider` (language + currency in `localStorage`, default from `navigator.language`); header switchers; refactor `formatCurrency/formatDate` to read the locale; extract strings of the header, cart, PDP buy box and checkout into resource files (en, hi), lazy-loaded per language; plurals for cart count; display-only currency conversion using rates from an API config endpoint (prices remain INR in the backend and in payment, so say so in the UI: "Charged in INR"); `dir="rtl"` smoke test with a pseudo RTL language.

**Acceptance criteria**
- [ ] Switching language updates all extracted strings without reload and persists.
- [ ] Currency switch changes displayed prices, never the charged amount.
- [ ] Plurals correct for 0/1/2/many; dates and numbers localized.
- [ ] RTL smoke test shows no broken layout in header, cart and PDP.

**Resources.** MDN Intl: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl · react-i18next: https://react.i18next.com/ · i18next: https://www.i18next.com/ · Tailwind logical properties: https://tailwindcss.com/docs/padding

### 13.9 SEO and social metadata in an SPA

**Concept.** Search engines can render JS but prefer content in the initial HTML; social crawlers usually do not run JS. In SPA mode, titles/meta set by `meta` appear only after JS runs. Mitigations: sensible per-route titles, `JSON-LD`, `sitemap.xml`/`robots.txt`, **prerendering** static routes at build time (React Router's `prerender` option), and for the key SEO pages (PDP, category) consider SSR (Stage 14 deep dive).

**Why it matters in ShopSphere.** Organic search is a major e-commerce channel.

**Library/API.** `meta` export (title, description, canonical `link` via `links`, Open Graph/Twitter tags), JSON-LD `Product`/`Offer`/`AggregateRating`/`BreadcrumbList` in a `<script type="application/ld+json">`, `prerender` in `react-router.config.ts`, `public/robots.txt`, sitemap generation script, Lighthouse SEO category, Google Rich Results Test.

**Hands-on task.** Complete per-route `meta` (title templates, descriptions, canonical URLs without tracking params), `noindex` for cart/checkout/account/login, JSON-LD on PDP (name, image, sku, brand, offers price/availability, aggregateRating), `BreadcrumbList`; `robots.txt` and a script that generates `sitemap.xml` from the products API; evaluate `prerender` for `/`, `/help`, `/policies/*`; test with the Rich Results Test using your deployed preview (Stage 14) or paste-in HTML.

**Acceptance criteria**
- [ ] Lighthouse SEO >= 95 on PDP and listing.
- [ ] Rich Results validation passes for Product structured data (with the stated caveat about client-side rendering).
- [ ] Private pages are `noindex`.
- [ ] You can explain exactly what SSR would change for crawlers and link previews.

**Resources.** RR `meta`: https://reactrouter.com/start/framework/route-module#meta · RR pre-rendering: https://reactrouter.com/how-to/pre-rendering · Google structured data (Product): https://developers.google.com/search/docs/appearance/structured-data/product · Open Graph protocol: https://ogp.me/ · Rich Results Test: https://search.google.com/test/rich-results

### 13.10 PWA: installable and offline-aware

**Concept.** A PWA adds a **web app manifest** (name, icons, theme color, `display: standalone`) and a **service worker** (a background script that intercepts network requests) enabling installability, offline fallbacks and cache strategies. Service workers are powerful and risky: stale caches can pin users to old code, and caching authenticated API responses is dangerous.

**Why it matters in ShopSphere.** Installable shop, offline page, faster repeat visits, push-notification readiness.

**Library/API.** `manifest.webmanifest`, icons (192, 512, maskable), `vite-plugin-pwa` (Workbox; check compatibility with your Vite version and React Router plugin, otherwise hand-write a minimal service worker), Workbox strategies (`CacheFirst` for static assets/images, `StaleWhileRevalidate` for public catalog GETs, `NetworkOnly` for auth/cart/orders), offline fallback route `/offline`, `navigator.serviceWorker`, "update available" toast, `beforeinstallprompt`.

**Hands-on task.** Add manifest + icons; service worker with: precache app shell, runtime caching rules above, offline fallback page showing cached recently viewed products, an update flow ("New version available, Reload"), an install button (where supported). Test in DevTools Application panel (Service Workers, Cache Storage, Offline checkbox, Lighthouse "Installable").

**Acceptance criteria**
- [ ] Lighthouse reports installable; app launches standalone.
- [ ] Offline: browsing visited catalog pages works, cart/checkout show a clear "You are offline" state, nothing breaks silently.
- [ ] Authenticated responses (cart, orders, me) are never cached by the service worker.
- [ ] A new deployment is picked up (update toast), and "Unregister + clear storage" is documented for debugging.

**Resources.** web.dev PWA: https://web.dev/learn/pwa · MDN service workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API · MDN manifest: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest · Workbox: https://developer.chrome.com/docs/workbox · vite-plugin-pwa: https://vite-pwa-org.netlify.app/

### 13.11 Network performance: caching headers and request hygiene

**Concept.** The fastest request is the one not made. Combine Query caching, HTTP caching (`Cache-Control`, `ETag`/`If-None-Match` -> 304), compression (gzip/brotli), request deduplication and avoiding waterfalls.

**Why it matters in ShopSphere.** Catalog endpoints are read-heavy and cacheable; B12 adds Redis + HTTP caching on the server, and you verify the client benefits.

**Library/API.** DevTools Network (Size column "(disk cache)", "304"), response headers, `Cache-Control: public, max-age, stale-while-revalidate`, `ETag`, `Vary`, Query `staleTime`, `link rel=preconnect` to the API origin.

**Hands-on task.** After B12: for 5 endpoints record headers before/after; check 304 flows; add `<link rel="preconnect" href="API_ORIGIN">`; find and remove one request waterfall and one duplicate request; document in the perf log.

**Acceptance criteria**
- [ ] At least three endpoints show conditional 304 responses on revalidation.
- [ ] No duplicate identical requests in the first 5 seconds of home load.
- [ ] You can explain how Query `staleTime` and HTTP `max-age` interact (two caches).

**Resources.** MDN HTTP caching: https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching · web.dev HTTP cache: https://web.dev/articles/http-cache · `preconnect`: https://web.dev/articles/preconnect-and-dns-prefetch

### Checkpoint: explain it without notes (Stage 13)
1. Define LCP, INP and CLS and name one fix for each in ShopSphere.
2. What does `useTransition` change about rendering, and what does it not?
3. When is virtualization the wrong tool?
4. Why measure on a production build with throttling?
5. What must a service worker never cache in this app, and why?
6. What does SPA mode cost SEO, and what are your mitigations?
7. Which of your manual memoizations would you delete if the React Compiler is on?

**Tag:** `git tag stage-13-done`.

---

## Stage 14: Production and deep dives

| | |
| --- | --- |
| **Guide stage** | 8 Production Awareness and AI-Assisted Development |
| **Needs** | **B12** complete (jobs, caching, audit log, hardening). The backend `Dockerfile` already exists |
| **Time** | 1.5 weeks (+ optional deep dive 0.5 to 1 week) |
| **Branch prefix** | `s14/` |
| **Pages** | none new; build, CI, deployed environments, observability |

### 14.1 Dev vs production build

**Concept.** `react-router dev` serves unbundled modules with HMR, readable errors and extra checks (StrictMode double-invoke, dev warnings). `react-router build` bundles, minifies, tree-shakes, hashes filenames for caching, inlines `import.meta.env.VITE_*` as constants and emits static assets. In **SPA mode** the output is a static site (client assets + an `index.html` shell, in `build/client`); there is no Node server at runtime. Note: the scaffold's `start` script (`react-router-serve`) is for SSR builds. For SPA output, serve `build/client` with any static server that falls back to `index.html` for unknown paths.

**Why it matters in ShopSphere.** Many bugs exist only in production (env var baked wrongly, missing SPA fallback causing 404 on refresh, case-sensitive paths, minifier differences).

**Library/API.** `npm run build`, `build/client`, `vite preview` or `npx serve -s build/client`, source maps (`build.sourcemap`), content hashing, `import.meta.env.MODE/PROD/DEV`.

**Hands-on task.** Build; inspect `build/client` (files, sizes, hashes); serve it statically; reproduce the "refresh on `/p/x` gives 404" problem on a naive static server, then fix with the SPA fallback flag; compare dev vs prod behaviour of: effects double-run, error messages, `console` output, bundle size. Update the `start`/`preview` npm scripts so they match SPA reality (document the change).

**Acceptance criteria**
- [ ] Deep-linking and refresh work on every route in the production build.
- [ ] You can list five differences between dev and prod and one bug that only appears in prod.
- [ ] `npm run build` is part of `npm run check`.

**Resources.** Vite building for production: https://vite.dev/guide/build · RR SPA mode: https://reactrouter.com/how-to/spa · RR deploying: https://reactrouter.com/start/framework/deploying

### 14.2 Environments, config, cookies and CORS across domains

**Concept.** Three environments: **local**, **staging** (optional), **production**. Only `VITE_*` values are baked in at build time. The most common production auth break: **cookie domain rules**. A refresh cookie set by `api.example.com` for a frontend on `app.example.com` is **same-site** (same registrable domain), so `SameSite=Lax` works. A frontend on `*.vercel.app` and an API on `*.onrender.com` is **cross-site**: the cookie needs `SameSite=None; Secure` and may be blocked by browsers' third-party-cookie restrictions. Prefer a custom domain with a shared parent, or proxy API requests through the frontend host under the same origin.

**Why it matters in ShopSphere.** Your auth design (Stage 10) depends on cookies.

**Library/API.** `.env.production`, host-level env settings, backend `CORS_ORIGIN`, `COOKIE_DOMAIN`, `COOKIE_SAMESITE`, `COOKIE_SECURE`, host rewrite/proxy rules, `Secure` requires HTTPS.

**Hands-on task.** Write `docs/environments.md`: table of every variable per environment (frontend + backend), who sets it, where, and whether it is secret. Decide the domain strategy (custom domain + subdomains, or proxy) and document why. Configure the backend env for production CORS/cookies (Claude helps).

**Acceptance criteria**
- [ ] No secret in any `VITE_*` variable (checked by grepping the production bundle).
- [ ] Login persists across refresh in the deployed environment (cookie accepted).
- [ ] Preview deployments are either allowed in CORS safely (explicit origins) or documented as unsupported.

**Resources.** Vite env: https://vite.dev/guide/env-and-mode · MDN SameSite: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value · web.dev SameSite explained: https://web.dev/articles/samesite-cookies-explained · MDN CORS: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

### 14.3 Docker for the frontend

**Concept.** A multi-stage Docker build compiles the app in a Node image and copies only static output into a tiny web server image (nginx/caddy) with SPA fallback and caching headers. The scaffold's `Dockerfile` targets an SSR runtime; for SPA mode replace it.

**Why it matters in ShopSphere.** Reproducible builds and deployment portability; one `docker compose up` for the whole stack.

**Library/API.** `Dockerfile` multi-stage (`node:24-alpine` build -> `nginx:alpine`), `nginx.conf` with `try_files $uri /index.html;`, immutable caching for hashed assets, `no-cache` for `index.html`, gzip/brotli, security headers, `.dockerignore`, build args for `VITE_*`.

**Hands-on task.** Read the scaffold's Dockerfile and explain each stage. Write `Dockerfile.spa` (or replace) + `nginx.conf`; build with `--build-arg VITE_API_URL=...`; add a `frontend` service to a compose override and run the full stack locally in containers. Check headers with `curl -I`.

**Acceptance criteria**
- [ ] Image size < 60 MB; runs as non-root if feasible.
- [ ] Deep links work; `index.html` is not cached long-term; hashed assets are `immutable`.
- [ ] The container works with the dockerized backend.

**Resources.** Docker multi-stage builds: https://docs.docker.com/build/building/multi-stage/ · nginx `try_files`: https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files · Docker best practices: https://docs.docker.com/build/building/best-practices/

### 14.4 Continuous integration with GitHub Actions

**Concept.** CI runs your quality gates on every push/PR in a clean environment so "works on my machine" stops mattering. Required checks gate merging.

**Why it matters in ShopSphere.** Protects `main` as AI-generated and manual changes accumulate.

**Library/API.** `.github/workflows/ci.yml`, `actions/checkout`, `actions/setup-node` (node-version 24, `cache: npm`), `npm ci`, jobs/steps/matrix, `needs`, artifacts (`actions/upload-artifact` for Playwright reports), services/containers for e2e, `concurrency` group to cancel superseded runs, branch protection rules.

**Hands-on task.** Workflow `ci.yml` for the frontend: install, `lint`, `typecheck`, `test`, `build`, upload build artifact; second job `e2e` (Playwright with the backend started via docker compose services or against a deployed staging API), uploading the HTML report/traces on failure. Add a Lighthouse CI job with budgets (optional). Add a PR template with the Definition of Done checklist. Enable branch protection requiring CI.

**Acceptance criteria**
- [ ] A PR with a deliberately failing test is blocked and shows which step failed.
- [ ] CI time < 8 minutes thanks to npm caching and parallel jobs.
- [ ] Failed e2e runs produce a downloadable trace.

**Resources.** GitHub Actions: https://docs.github.com/en/actions · Workflow syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions · setup-node: https://github.com/actions/setup-node · Playwright CI: https://playwright.dev/docs/ci-intro

### 14.5 Deployment: frontend, backend, database

**Concept.** Static frontend on a CDN host; API as a container/Node service; MongoDB on a managed cluster (Atlas free M0 tier is a replica set, so transactions work); Redis managed (Upstash/Render). Secrets live in the host's secret store, not in git. After deployment, third parties need updating: Razorpay webhook URL (public HTTPS), Google OAuth redirect URI, CORS origin, email provider (Mailpit is local only: use a real SMTP/provider in production).

**Why it matters in ShopSphere.** "Deployed and shareable" is the proof that you can ship.

**Library/API.** Vercel (https://vercel.com/docs) or Netlify (https://docs.netlify.com/) for the SPA with rewrite `/* -> /index.html`; Render, Railway or Fly.io for the backend container; MongoDB Atlas; environment variables per service; custom domain + HTTPS; health check path `/api/v1/health`.

**Hands-on task.** Deploy: (1) Atlas cluster (restrict network access, create DB user), (2) backend service from its Dockerfile with env vars (JWT secrets, Mongo URI, CORS origin, cookie settings, Razorpay test keys, SMTP provider), seed production-like demo data (**careful: never run destructive reset against production data**), (3) frontend with `VITE_API_URL` pointing to the API, SPA rewrite rule. (4) Update Razorpay webhook and Google OAuth URIs. (5) Run the **post-deploy smoke checklist**: register, verify email, login, search, add to cart, apply coupon, COD order, Razorpay test payment, webhook received, order tracking live, notification bell, logout, refresh deep link, 404 page.

**Acceptance criteria**
- [ ] All smoke steps pass on the public URL on a phone (4G) and desktop.
- [ ] Rollback plan written: how to redeploy the previous version for each service.
- [ ] No secret in git history (scan with `git log -p | grep` or `gitleaks`).
- [ ] You know the cost of each service and have set spending limits/alerts.

**Resources.** Vercel docs: https://vercel.com/docs · Vercel SPA rewrites: https://vercel.com/docs/project-configuration#rewrites · Netlify redirects: https://docs.netlify.com/routing/redirects/ · Render docs: https://render.com/docs · Railway docs: https://docs.railway.com/ · Fly.io docs: https://fly.io/docs/ · MongoDB Atlas: https://www.mongodb.com/docs/atlas/ · Razorpay webhooks: https://razorpay.com/docs/webhooks/

### 14.6 Observability: error tracking and monitoring

**Concept.** In production you cannot see the console. **Error tracking** (Sentry) captures exceptions with stack traces, breadcrumbs (clicks, requests), release version and user context. Source maps turn minified stack traces into readable ones. Add privacy discipline: no PII or tokens in events.

**Why it matters in ShopSphere.** You learn about production failures from data, not from customers.

**Library/API.** `@sentry/react` (`Sentry.init({ dsn, release, environment, tracesSampleRate, integrations })`, `Sentry.ErrorBoundary`, `Sentry.setUser({ id })`, `Sentry.captureException`), `@sentry/vite-plugin` for source map upload, release tagging via the git SHA, `beforeSend` scrubbing, web-vitals reporting (13.1), uptime monitor (UptimeRobot/Better Stack), backend logs (pino) correlation using request ids (`x-request-id`).

**Hands-on task.** Integrate Sentry (free plan), route your `lib/report.ts` and boundaries to it, upload source maps in the build/CI step, set user context (id only), test with a deliberate error in a production build, then verify the readable stack trace and breadcrumbs. Add an uptime check to `/api/v1/health` and the frontend URL.

**Acceptance criteria**
- [ ] A thrown production error appears in Sentry with an un-minified stack trace and release tag.
- [ ] Events contain no emails, tokens or full URLs with secrets (`beforeSend` proves it).
- [ ] You can follow an API error from a frontend event to the backend log through the request id.

**Resources.** Sentry for React: https://docs.sentry.io/platforms/javascript/guides/react/ · Source maps: https://docs.sentry.io/platforms/javascript/sourcemaps/ · Sentry Vite plugin: https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/ · Data scrubbing: https://docs.sentry.io/platforms/javascript/data-management/sensitive-data/

### 14.7 Documentation and handover

**Concept.** Code that nobody can run or understand is not finished. Docs are for your future self and for reviewers/employers: README (what, how to run, architecture), runbook (deploy, rollback, rotate secrets), ADRs (why decisions were made), contributing guide (branching, Definition of Done).

**Why it matters in ShopSphere.** This repo is your portfolio.

**Library/API.** Markdown, Mermaid diagrams (rendered by GitHub), ADR template.

**Hands-on task.** Write: root `README` improvements (screenshots/GIF of the main flows, architecture diagram of browser/frontend/API/Mongo/Redis/Razorpay/Socket.io/Mailpit), `docs/adr/` with at least 6 ADRs (SPA vs SSR, fetch vs axios, Query vs hand-rolled, Zustand scope, token storage, Razorpay verification model), `docs/runbook.md`, `docs/testing.md`, and a "what I would do next" list.

**Acceptance criteria**
- [ ] A friend can clone, follow the README and run the full stack in 15 minutes.
- [ ] Each ADR has context, decision, consequences, status.
- [ ] README states known limitations honestly.

**Resources.** ADR guide: https://adr.github.io/ · Mermaid in GitHub: https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams · Keep a Changelog: https://keepachangelog.com/

### 14.8 Deep dive: flip to SSR, loaders/actions and compare with TanStack Start

**Concept.** With `ssr: true` the server renders HTML for each request: first paint has content and metadata (better SEO and link previews), but you now run Node in production, must avoid browser-only APIs during server render (`window`, `localStorage` in render), and face **hydration** (client must produce the same HTML). Route modules gain **`loader`** (server data), **`action`** (mutations via `<Form>`/fetchers), streaming with promises + `<Await>`/`Suspense`, and `meta` can use loader data. In RR, `clientLoader`/`clientAction` run in the browser. TanStack Start (your `/admin`) achieves similar goals with file-based routes and `createServerFn` server functions.

**Why it matters in ShopSphere.** You choose SPA vs SSR for the right reasons in your next project, and can read both codebases.

**Library/API.** `react-router.config.ts` `ssr: true` (and `prerender`), `export async function loader({ params })`, `useLoaderData`/`Route.ComponentProps["loaderData"]`, `export async function action`, `<Form>`, `useFetcher`, `defer`-style promise streaming (return promises from loader and read with `<Await>`/`use`), `react-router-serve` (`npm start`), `Cache-Control` headers from loaders, cookies on the server (forward the refresh cookie to the API from the loader), `.client.ts`/`.server.ts` file conventions.

**Hands-on task.** On branch `s14/ssr-deep-dive`:
1. Set `ssr: true`; run `npm run build && npm start`; fix every crash caused by browser-only code in render (guard or move to effects).
2. Convert **only** the PDP route to a `loader` that fetches the product server-side (the API base URL for server-to-server calls may differ from the browser one); use it for `meta`, JSON-LD and the first render, while reviews/recommendations stay client-side Query. Seed Query with loader data via `initialData`.
3. Verify **View Source** contains the title, price and structured data; compare Lighthouse SEO and LCP with the SPA version in your perf log.
4. Convert the login form to an `action` with `<Form>` and compare to your RHF + mutation version (what do you gain: progressive enhancement; what do you lose: client-side validation ergonomics).
5. Open `/admin` (TanStack Start): find the router config, a route with a `loader`, a `createServerFn` call and compare the data-loading model to RR's.
6. Write an ADR: "Would I ship ShopSphere as SPA or SSR? Why?".

**Acceptance criteria**
- [ ] SSR build runs; View Source of `/p/<slug>` shows real product HTML.
- [ ] No hydration mismatch warnings in the console.
- [ ] You can explain the auth implications (cookies forwarded server-side, no `localStorage`).
- [ ] The comparison table (SPA vs RR SSR vs TanStack Start) is in the ADR with at least 6 dimensions (SEO, TTFB, infra, DX, caching, complexity).

**Common mistakes / observe in DevTools**
- Reading `localStorage` or `window.innerWidth` during render (server crash/hydration mismatch).
- Duplicate fetching: loader fetches on the server, then Query refetches on the client (seed with `initialData` and set `staleTime`).
- **Network tab:** the document request now contains the HTML; **Elements vs View Source** now match.

**Resources.** RR data loading: https://reactrouter.com/start/framework/data-loading · RR actions: https://reactrouter.com/start/framework/actions · RR streaming: https://reactrouter.com/how-to/suspense · RR rendering strategies: https://reactrouter.com/start/framework/rendering · TanStack Start: https://tanstack.com/start/latest · TanStack Router: https://tanstack.com/router/latest · React hydration: https://react.dev/reference/react-dom/client/hydrateRoot

### 14.9 Release checklist and retrospective

**Concept.** Before calling it done, run a structured release review across function, security, performance, accessibility and operations. Then reflect.

**Hands-on task.** Run the checklist; write `docs/retrospective.md` (what you learned per stage, what was hard, what you would do differently, what you still cannot explain). Re-do the [self-assessment rubric](#8-self-assessment-rubric) and compare with your Stage 0 self-rating.

**Acceptance criteria**
- [ ] Checklist items verified: all e2e green; axe clean; Lighthouse mobile >= 90 on home/PDP/listing; no console errors; error tracking live; backups/rollback known; secrets rotated if ever exposed; legal pages present; test payments only.
- [ ] Rubric re-score shows no topic below "can explain with notes".
- [ ] You wrote down the next three learning goals.

### Checkpoint: explain it without notes (Stage 14)
1. List the steps from `git push` to a changed page on the public URL, naming every system involved.
2. Why does a cross-site refresh cookie fail in production, and what are two fixes?
3. What does Sentry need to show a readable stack trace?
4. What does `ssr: true` change for `localStorage` code, and how do you handle it?
5. What are loaders/actions in RR and how do they compare with Query?
6. How do you roll back a bad frontend deploy and a bad backend deploy?
7. Why is a webhook URL a production concern and not a local one?

**Tag:** `git tag stage-14-done` and `git tag v1.0.0`.

---

## Optional admin track

| | |
| --- | --- |
| **Purpose** | Read and extend code you did not write: the `/admin` app (TanStack Start + TanStack Router + shadcn). Reading unfamiliar code is a core job skill; this also contrasts file-based routing and server functions with your React Router app |
| **Needs** | **B11** (seller + admin endpoints + analytics). Claude builds `/admin` against B11 after you finish Stage 11 (or earlier, in parallel) |
| **Time** | 1 to 2 weeks, optional |
| **Branch prefix** | `admin/` (in the admin folder's own tasks) |

### A.1 Orientation: TanStack Router file routes and Start

**Concept.** TanStack Router uses **file-based routes** in `src/routes/` (a generated `routeTree.gen.ts`), type-safe `Link`/`navigate`, route `loader`, `beforeLoad` (guards), and **validated search params** (`validateSearch`, Zod adapter). TanStack Start adds SSR and **server functions** (`createServerFn`) on top. Dev port is 3000 (`vite dev --port 3000`).

**Why it matters in ShopSphere.** Same product, different architecture. Comparing the two teaches you which ideas are universal (nested layouts, params, data loading, guards) and which are framework-specific.

**Library/API.** `@tanstack/react-router` (`createFileRoute`, `createRootRoute`, `Outlet`, `Link`, `redirect`), `@tanstack/react-start`, `tsr generate` (`npm run generate-routes`), devtools.

**Hands-on task.** Run `/admin` (`npm run dev`). Draw a map of its route tree. For each of five routes, note: path, file, loader (if any), guard (`beforeLoad`), and the API calls. Write a table "RR (frontend) vs TanStack Router (admin)" for: route definition, layouts, params, search params, data loading, guards, error/404, code splitting, type-safety. Find where admin auth (role `admin`) is enforced.

**Acceptance criteria**
- [ ] Table has at least 9 rows, each verified in the code, not assumed.
- [ ] You can explain how a search-param filter on an admin table is validated and typed.

**Resources.** TanStack Router docs: https://tanstack.com/router/latest · File-based routing: https://tanstack.com/router/latest/docs/framework/react/routing/file-based-routing · Search params: https://tanstack.com/router/latest/docs/framework/react/guide/search-params · TanStack Start: https://tanstack.com/start/latest

### A.2 Data tables: TanStack Table

**Concept.** TanStack Table is a **headless** table engine: you define columns; it provides sorting, filtering, pagination, selection and visibility state; you render the markup. For large datasets use **server-side** pagination/sorting/filtering (state sent as query params to the API).

**Why it matters in ShopSphere.** Orders, users, products, coupons and reviews moderation are tables.

**Library/API.** `@tanstack/react-table`: `useReactTable`, `getCoreRowModel`, `getSortedRowModel`, `getPaginationRowModel`, `ColumnDef`, `manualPagination`, `manualSorting`, `flexRender`; shadcn `table` and the data-table recipe.

**Hands-on task.** Read the admin orders table implementation. Then build (in your frontend or the admin, your choice) a table component for **your** `/orders` page on desktop: sortable columns, status filter, server pagination from URL state, column visibility toggle, row selection for "Download invoices".

**Acceptance criteria**
- [ ] Sort/filter/page state lives in the URL and drives the API query.
- [ ] Keyboard and screen-reader semantics are intact (real `<table>`, `scope` headers, `aria-sort`).
- [ ] You can state the difference between client-side and manual (server-side) modes.

**Resources.** TanStack Table: https://tanstack.com/table/latest · Introduction: https://tanstack.com/table/latest/docs/introduction · shadcn data table: https://ui.shadcn.com/docs/components/data-table

### A.3 Charts: Recharts and analytics dashboards

**Concept.** Dashboards turn aggregation endpoints (B11: revenue by day, orders by status, conversion funnel, top products, category share) into charts. Keep charts accessible: titles, text alternatives, tables as fallback, colorblind-safe palettes; avoid animating on every refetch.

**Why it matters in ShopSphere.** Admin analytics and the seller dashboard.

**Library/API.** `recharts` (`LineChart`, `BarChart`, `PieChart`, `ResponsiveContainer`, `Tooltip`, `Legend`) or shadcn `chart` (built on Recharts); Query for data with `staleTime`; date-fns for ranges; `Intl` formatting for axes.

**Hands-on task.** Read the admin dashboard; then build a "My spending" page in your account area (orders by month bar chart, spend by category donut, average order value) from existing order data with `useQuery` + `select` transforms.

**Acceptance criteria**
- [ ] Charts resize responsively; tooltips are formatted in the active locale/currency.
- [ ] A data table equivalent of each chart is available (accessibility).
- [ ] Empty and loading states exist; no animation on refetch of identical data.

**Resources.** Recharts: https://recharts.org/en-US/ · shadcn charts: https://ui.shadcn.com/docs/components/chart · date-fns: https://date-fns.org/docs/Getting-Started

### A.4 Role-gated layouts and seller flows

**Concept.** Admin and seller areas are separate product surfaces with role-based access: layout-level guards, API-enforced permissions, audit logs for sensitive actions.

**Why it matters in ShopSphere.** Real marketplaces have three audiences; mixing them in one UI is a security and UX smell.

**Library/API.** Route guards (`beforeLoad` in TanStack Router; layout routes in RR), role helpers, audit log viewer (B12), image upload for products (B7).

**Hands-on task.** In your `/seller` area (frontend): products list (own products only), stock quick-edit (inline, optimistic), "Orders to fulfil" with status actions respecting the order state machine. Then read how `/admin` handles the same ideas at larger scale (users, coupons, reviews moderation, audit log) and write 5 observations about what you would change.

**Acceptance criteria**
- [ ] A seller cannot see or edit another seller's product (verified by API rejection, not just UI hiding).
- [ ] Status actions offered match the state machine (`canTransition`).
- [ ] Audit log shows your changes with actor and timestamp (B12).

**Resources.** TanStack Router authenticated routes: https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes · OWASP authorization cheat sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html

### Checkpoint: explain it without notes (Admin track)
1. How does a file path become a route in TanStack Router, and how does RR config differ?
2. What does "headless" mean for TanStack Table and why is it a good fit for shadcn?
3. Why must seller isolation be enforced by the API?
4. When would you pick TanStack Start over RR framework mode for a project?

**Tag:** `git tag admin-track-done`.

---

## 5. Library map

"Need?" means: **Core** (you will use it every day), **Stage-bound** (learn it in its stage), **Optional** (nice to have).

| Library | What it is | When (stage) | Alternatives | Need? |
| --- | --- | --- | --- | --- |
| React 19 | UI library | all | Vue, Svelte, Solid | Core |
| React Router 8 (`react-router`) | Routing, layouts, optional loaders/SSR | 5, 14 | TanStack Router, Wouter | Core |
| TypeScript 6 | Static types | 2 onward | Flow (dead), JSDoc types | Core |
| Vite 8 | Dev server and bundler | 0, 14 | webpack, Rspack, Parcel | Core (already set up) |
| Tailwind CSS 4 | Utility-first styling | all | CSS Modules, vanilla-extract | Core |
| shadcn/ui + Base UI | Copy-in components on accessible headless primitives | 3, all | Radix UI, MUI, Ark UI, Mantine | Core |
| lucide-react | Icons | all | Heroicons, Phosphor | Core |
| Zod 4 | Runtime schemas and inferred types | 2, 7 | Valibot, ArkType, Yup | Core |
| React Hook Form + `@hookform/resolvers` | Performant forms, Zod bridge | 7 | TanStack Form, Formik, native `<form action>` + `useActionState` | Core |
| TanStack Query v5 | Server-state cache, mutations, infinite queries | 9 | SWR, RTK Query, Apollo (GraphQL) | Core |
| Zustand | Tiny client-state store | 8 | Redux Toolkit, Jotai, Valtio, Context | Stage-bound |
| fetch (native) | HTTP client | 1, 6 | axios, ky, ofetch | Core |
| axios / ky | HTTP clients with interceptors/hooks | 6 (compare) | fetch | Optional |
| Sonner | Toasts | 8 | react-hot-toast, react-toastify | Stage-bound |
| socket.io-client | Real-time (WebSocket with fallbacks) | 11 | native WebSocket, SSE, Ably/Pusher | Stage-bound |
| Razorpay Checkout (`checkout.js`) | Payment modal (test mode) | 11 | Stripe Elements, PayU, Cashfree | Stage-bound |
| Vitest | Test runner | 12 | Jest | Core |
| React Testing Library + user-event + jest-dom | Component tests by behaviour | 12 | Enzyme (dead), Playwright CT | Core |
| MSW 2 | Network-level mocking | 12 | nock (Node only), `vi.fn(fetch)`, Mirage | Stage-bound |
| Playwright | End-to-end tests | 12 | Cypress, WebdriverIO | Stage-bound |
| axe-core (`@axe-core/playwright`, `vitest-axe`) | Automated a11y checks | 12 | Pa11y, Lighthouse | Stage-bound |
| ESLint + typescript-eslint + react-hooks + jsx-a11y | Static checks | 0, 4, 12 | Biome, oxlint | Core |
| Prettier + tailwind plugin | Formatting | 0 | Biome | Core (set up) |
| TanStack Virtual | List virtualization | 13 | react-window, react-virtuoso | Stage-bound |
| TanStack Table | Headless data tables | Admin track | AG Grid, MUI DataGrid | Optional |
| Recharts / shadcn charts | Charts | Admin track | Visx, Chart.js, ECharts | Optional |
| Motion (`motion/react`) | Animation | 13 | CSS transitions, react-spring, GSAP | Optional |
| date-fns | Date utilities (prefer `Intl` first) | 13 | Day.js, Luxon, Temporal (future) | Optional |
| react-i18next | Translations | 13 | react-intl, Lingui, Paraglide | Optional |
| web-vitals | Core Web Vitals measurement | 13 | PerformanceObserver by hand | Stage-bound |
| vite-plugin-pwa / Workbox | Service worker tooling | 13 | hand-written SW | Optional |
| Embla Carousel | Carousel engine (via shadcn) | 11 | Swiper, CSS scroll-snap | Optional |
| `react-error-boundary` | Error boundary helper | 12 | hand-written class | Optional |
| Sentry (`@sentry/react`) | Error and performance monitoring | 14 | Datadog RUM, Highlight, LogRocket | Stage-bound |
| Docker + nginx | Container build/serve | 14 | static hosts (Vercel/Netlify) | Stage-bound |
| GitHub Actions | CI | 14 | GitLab CI, CircleCI | Stage-bound |
| DOMPurify | HTML sanitizing (only if rendering HTML) | 10 | sanitize-html | Optional |

**Rule for adding a library:** answer in writing (1) what problem, concretely, in ShopSphere? (2) what is the platform/React alternative? (3) bundle cost? (4) is it maintained? If you cannot answer, do not add it.

---

## 6. Milestone checklist

Tick a box when every acceptance criterion of that item is met **and** the branch is merged and tagged. Backend rows track what you asked Claude to deliver.

### Backend phases (Claude builds)

- [ ] **B0** Scaffold + health + auth + users + products (read) + seed (done at start)
- [ ] **B1** Categories, brands, product facets (before S5)
- [ ] **B2** Wishlist + addresses (before S6)
- [ ] **B3** Cart: guest + merge (before S9)
- [ ] **B4** Coupons + deals/flash sales (before 11.2)
- [ ] **B5** Orders + stock transactions (before 9.10 or 11.3)
- [ ] **B6** Razorpay payments + webhooks (before 11.4)
- [ ] **B7** Reviews, ratings, Q&A + image upload (before 7.8 real upload or 11.6)
- [ ] **B8** Search autocomplete + recommendations + recently viewed (before 11.7)
- [ ] **B9** Notifications (Socket.io) + order tracking (before 11.9)
- [ ] **B10** Google OAuth + email verification/reset (before S10)
- [ ] **B11** Seller + admin endpoints + analytics (before Admin track)
- [ ] **B12** Jobs, caching, audit log, hardening (before S13)

### Frontend stages (you build)

**Stage 0: Setup** (week 1)
- [ ] 0.1 Scaffold tour notes
- [ ] 0.2 Env vars and API ping
- [ ] 0.3 `@/` alias, Prettier, strict TS
- [ ] 0.4 Smoke test + DevTools orientation
- [ ] Checkpoint answered, `stage-00-done`

**Stage 1: JavaScript applied** (week 1 to 2)
- [ ] 1.1 Immutable helpers
- [ ] 1.2 `filterProducts` + explorer
- [ ] 1.3 `computeTotals`, `priceHistogram`, `brandCounts`
- [ ] 1.4 `sortProducts` + `compareBy`
- [ ] 1.5 Nullish handling
- [ ] 1.6 Async/await + `allSettled` + timeout
- [ ] 1.7 Modules + `formatCurrency`
- [ ] Checkpoint, `stage-01-done`

**Stage 2: TypeScript applied** (week 2 to 3)
- [ ] 2.1 Domain types
- [ ] 2.2 Discriminated unions (`AsyncState`, `OrderStatus`)
- [ ] 2.3 `unknown` + type guards
- [ ] 2.4 Generics (`ApiResponse<T>`, `request<T>`)
- [ ] 2.5 Typed React components/hooks
- [ ] 2.6 Zod schemas + `z.infer`
- [ ] Checkpoint, `stage-02-done`

**Stage 3: React fundamentals** (week 3)
- [ ] 3.1 `ProductCard` + grid
- [ ] 3.2 Keys bug demo
- [ ] 3.3 Gallery, Tabs, VariantPicker, static PDP
- [ ] 3.4 QuantityStepper + review form
- [ ] 3.5 `key` reset
- [ ] 3.6 Accessible shell + drawer
- [ ] Checkpoint, `stage-03-done`

**Stage 4: Hooks and effects** (weeks 4 to 5)
- [ ] 4.1 Effect mental model + HealthBadge
- [ ] 4.2 `useProducts` hand-rolled
- [ ] 4.3 Debounced, abortable search box
- [ ] 4.4 `useDebounce` + Rules of Hooks
- [ ] 4.5 `useRef` tasks
- [ ] 4.6 `useCountdown` + flash-sale strip
- [ ] 4.7 `useLocalStorage`, `useMediaQuery`, outside-click, recently viewed
- [ ] 4.8 Memoization measured
- [ ] 4.9 Stale closures
- [ ] 4.10 Five-bug hunt
- [ ] Checkpoint, `stage-04-done`

**Stage 5: Routing and organization** (weeks 6 to 7)
- [ ] 5.1 Route config
- [ ] 5.2 Layouts
- [ ] 5.3 Params + `paths.ts`
- [ ] 5.4 URL-driven filters/sort/pagination
- [ ] 5.5 Navigation, redirects, focus, scroll
- [ ] 5.6 Guards (stub)
- [ ] 5.7 404 + error boundaries
- [ ] 5.8 Meta + breadcrumbs
- [ ] 5.9 Code splitting observed
- [ ] 5.10 Feature-folder refactor + lint boundary
- [ ] Checkpoint, `stage-05-done`

**Stage 6: API integration by hand** (week 8)
- [ ] 6.1 API notes
- [ ] 6.2 API client layer
- [ ] 6.3 Address CRUD
- [ ] 6.4 Wishlist toggle
- [ ] 6.5 Async state components
- [ ] 6.6 Infinite scroll by hand
- [ ] 6.7 View models
- [ ] 6.8 `useFetch` + pain journal (10+ entries)
- [ ] Checkpoint, `stage-06-done`

**Stage 7: Forms and validation** (weeks 9)
- [ ] 7.1 RHF basics
- [ ] 7.2 Zod + resolver, login/register
- [ ] 7.3 Server errors + a11y
- [ ] 7.4 `Controller` widgets, address form
- [ ] 7.5 `useFieldArray` seller form
- [ ] 7.6 Async validation (pincode, coupon)
- [ ] 7.7 Multi-step checkout shell
- [ ] 7.8 Upload with preview
- [ ] Checkpoint, `stage-07-done`

**Stage 8: State ownership** (week 10)
- [ ] 8.1 Reducer for stepper
- [ ] 8.2 Auth/Theme/Toast context
- [ ] 8.3 Zustand cart UI + compare
- [ ] 8.4 State audit
- [ ] 8.5 Undo toasts
- [ ] Checkpoint, `stage-08-done`

**Stage 9: TanStack Query** (weeks 10 to 11)
- [ ] 9.1 Setup + products migrated
- [ ] 9.2 Key factories + `queryOptions`
- [ ] 9.3 Freshness policy
- [ ] 9.4 Mutations + invalidation
- [ ] 9.5 Optimistic wishlist/qty
- [ ] 9.6 Server cart facade
- [ ] 9.7 Prefetch + seeding
- [ ] 9.8 Infinite queries
- [ ] 9.9 Dependent/parallel queries
- [ ] 9.10 Polling orders
- [ ] 9.11 Migration retrospective
- [ ] Checkpoint, `stage-09-done`

**Stage 10: Auth** (week 12)
- [ ] 10.1 Token model diagram
- [ ] 10.2 Real AuthProvider
- [ ] 10.3 Single-flight refresh
- [ ] 10.4 Real guards + safe redirect
- [ ] 10.5 Verify + reset flows
- [ ] 10.6 Google sign-in
- [ ] 10.7 Security page + expiry UX
- [ ] 10.8 Guest merge on login
- [ ] 10.9 Security checklist
- [ ] Checkpoint, `stage-10-done`

**Stage 11: Commerce** (weeks 12 to 14)
- [ ] 11.1 Cart revalidation
- [ ] 11.2 Coupons + deals
- [ ] 11.3 Place order (idempotent)
- [ ] 11.4 Razorpay full flow (success, dismissed, failed)
- [ ] 11.5 Orders: tracking, cancel, return, invoice
- [ ] 11.6 Reviews + Q&A
- [ ] 11.7 Autocomplete (final)
- [ ] 11.8 Recently viewed + recommendations
- [ ] 11.9 Notifications + live tracking
- [ ] 11.10 Home/PDP/account completion
- [ ] Checkpoint, `stage-11-done`

**Stage 12: Quality** (weeks 14 to 15)
- [ ] 12.1 Vitest + pure tests
- [ ] 12.2 RTL component tests
- [ ] 12.3 Hook + timer tests
- [ ] 12.4 MSW integration tests
- [ ] 12.5 Five journey tests
- [ ] 12.6 Playwright e2e (COD end to end)
- [ ] 12.7 Bug-hunt (8 bugs)
- [ ] 12.8 Error boundaries
- [ ] 12.9 A11y audit
- [ ] 12.10 Quality gates
- [ ] Checkpoint, `stage-12-done`

**Stage 13: Performance and polish** (weeks 15 to 16)
- [ ] 13.1 Baselines
- [ ] 13.2 Render performance + Compiler decision
- [ ] 13.3 Bundle + code splitting
- [ ] 13.4 Virtualization
- [ ] 13.5 Images/fonts/CLS
- [ ] 13.6 Motion
- [ ] 13.7 Dark mode
- [ ] 13.8 i18n + currency
- [ ] 13.9 SEO
- [ ] 13.10 PWA
- [ ] 13.11 HTTP caching
- [ ] Checkpoint, `stage-13-done`

**Stage 14: Production** (week 16+)
- [ ] 14.1 Prod build + SPA fallback
- [ ] 14.2 Environments + cookies/CORS
- [ ] 14.3 Docker (SPA)
- [ ] 14.4 CI
- [ ] 14.5 Deployed + smoke checklist
- [ ] 14.6 Sentry + uptime
- [ ] 14.7 Docs + ADRs
- [ ] 14.8 SSR deep dive (optional)
- [ ] 14.9 Release checklist + retrospective
- [ ] Checkpoint, `stage-14-done`, `v1.0.0`

**Admin track (optional)**
- [ ] A.1 TanStack Router/Start comparison table
- [ ] A.2 Data table
- [ ] A.3 Charts
- [ ] A.4 Role-gated flows

---

## 7. AI-assisted development prompts per stage

Your guide: *use AI to accelerate learning and implementation, not to outsource understanding.* The prompts below follow three modes: **Learn** (explain), **Review** (critique what you wrote), **Verify** (challenge claims). Always paste your own code first. Replace `<...>`.

### Universal prompts

- **Explain-first:** "Explain `<concept>` to a UI developer who knows React state but not `<X>`. Use ShopSphere's `<feature>` as the example. End with 3 questions to check my understanding. Do not write the solution."
- **Review my code:** "Review this `<file>`. List correctness bugs first, then edge cases I missed, then readability. For each issue explain *why* it is a problem. Do not rewrite the whole thing."
- **Socratic hint ladder:** "I'm stuck on `<task>`. Give me hint level 1 only (a question that points me in the right direction). I'll ask for the next level if needed."
- **Verify an API:** "You suggested `<API>`. Show the official docs URL and quote the signature for version `<x>`. If you are not sure it exists in this version, say so."
- **Explain what AI wrote:** "Walk through this code line by line. What runs on first render, on update, on unmount? What are the failure modes?"
- **Simplify:** "What is the simplest version of this that still meets these acceptance criteria? What would I lose?"
- **Generate exercises:** "Create 5 small exercises on `<topic>` with hidden answers, increasing difficulty, in the context of an e-commerce app."
- **Debug protocol:** "Here is the symptom, what I expected, what I already tried, and the relevant code. Propose 3 hypotheses ordered by likelihood and the quickest experiment to confirm each. Do not fix it yet."

### Per-stage prompts

| Stage | Prompts (use after your own attempt) |
| --- | --- |
| 0 | "Explain the difference between dev and prod behaviour of Vite env variables, with examples of what leaks into the bundle." · "Walk me through what each file in this React Router scaffold does and which are generated." |
| 1 | "Give me 8 hand-checkable cart scenarios (with coupon edge cases) and the expected totals, so I can validate `computeTotals`." · "Critique my `filterProducts` for purity, complexity and edge cases." · "Explain `Promise.all` vs `allSettled` vs `race` with a failing request in a home page." |
| 2 | "Turn this API JSON into a Zod schema, then show me the inferred type; explain every modifier." · "Show me a case where `as` hides a bug and the same case caught by a type guard." · "Why does TypeScript accept this and what would `exactOptionalPropertyTypes` change?" |
| 3 | "Give me 3 bugs that appear when using array index as key in a sortable product grid, with a minimal repro." · "Audit this component for accessibility using WCAG 2.2 AA; cite the success criteria." |
| 4 | "Generate 5 broken `useEffect` snippets, each with one distinct bug (loop, missing cleanup, race, stale closure, derived state). Do not reveal the bugs; I'll diagnose." (after 4.10) · "Explain why StrictMode runs my effect twice and show a correct cleanup for this effect." · "What is wrong with debouncing inside the component body?" |
| 5 | "Compare React Router declarative, data and framework modes with a table. Which APIs are available in each?" · "Given these filter params, design a safe URL contract and parsing function; list invalid inputs I should test." |
| 6 | "Review my `api()` wrapper: error normalization, abort handling, timeouts, non-JSON errors. List what could go wrong in production." · "What are the trade-offs of refetching vs patching local state after a mutation?" |
| 7 | "Review this Zod schema for an Indian address (phone/pincode) and suggest edge cases. Explain `z.input` vs `z.output` for this schema." · "Why does my `useFieldArray` lose values when removing row 2? Explain the role of `field.id`." |
| 8 | "Classify these 25 pieces of state into local/URL/server/form/global with reasons; challenge my choices." · "Explain why this Context causes re-renders and show two fixes (split vs selector store)." |
| 9 | "Design a query key factory and invalidation plan for these mutations; list what each mutation should invalidate." · "Walk through the optimistic update lifecycle for wishlist toggle, including a race with a refetch." · "Review my `staleTime` policy for each data type and challenge it." |
| 10 | "Threat-model my token storage design: XSS, CSRF, token theft, replay. What is mitigated and what is not?" · "Review my single-flight refresh implementation for race conditions and infinite loops." |
| 11 | "Review my Razorpay integration against the official docs: what could let a user mark an order paid without paying?" · "Design the idempotency strategy for placing an order, including retries and lost responses." · "Review my socket hook for leaks and duplicate listeners under StrictMode." |
| 12 | "Given this component, list the user-visible behaviours to test and the ones I should not test. Then critique my tests for implementation detail coupling." · "Create 8 realistic injected bugs on a branch for me to find (do not tell me what they are)." · "Explain why this test is flaky and how to remove the flakiness." |
| 13 | "Interpret this Lighthouse report and Performance trace. What is the single highest-impact change? What evidence would confirm it?" · "Which of my `memo`/`useMemo` calls become unnecessary with the React Compiler, and which stay?" · "Review my service worker caching rules for security and staleness risks." |
| 14 | "Review my GitHub Actions workflow for speed, caching, security (permissions, secrets) and flakiness." · "Given frontend on `app.example.com` and API on `api.example.com`, what cookie attributes and CORS settings are correct?" · "Compare SPA vs SSR for ShopSphere across SEO, TTFB, infra, DX and complexity." |
| Admin | "Map this TanStack Router route file to the equivalent React Router config; list what differs." · "Explain this TanStack Table column/state setup and what `manualPagination` changes." |

### Prompting etiquette for Claude Code in this repo

- Ask for **one backend phase at a time** and include the stage that needs it: "Build B3 (cart with guest + merge). I start Stage 9 tomorrow. Update Swagger and `docs/API-CONVENTIONS.md`, seed carts, and add tests."
- After each phase, **read Swagger yourself** and write the API notes (6.1) before coding the UI.
- When asking for a review of your frontend, point at files: "Review `frontend/app/features/cart/` against Stage 9.6 acceptance criteria; list unmet ones."
- Keep AI out of the Checkpoint questions and out of the first attempt of Hands-on tasks.

---

## 8. Self-assessment rubric

Score each row at the end of each stage (and again at the end):

- **0** = cannot explain.
- **1** = can explain with notes or docs.
- **2** = can explain without notes in plain language.
- **3** = can explain **and** debug a broken example **and** teach it to someone else.

Goal by the end: no row below **2**, and rows marked ★ at **3**.

| Area | Can you... | Stage | Score |
| --- | --- | --- | --- |
| JS | transform lists with `filter/map/reduce/sort/groupBy` without mutation? | 1 | |
| JS | explain `fetch` failure modes, `Promise.all` vs `allSettled`, abort? | 1 | |
| TS | model async/order states as discriminated unions with exhaustiveness? | 2 | |
| TS | explain `unknown` vs `any`, generics in `request<T>`, and `z.infer`? | 2 | |
| React | explain keys, derived vs stored state, resetting state with `key`? | 3 | |
| Effects ★ | explain when to use an effect and when not (5 examples each)? | 4 | |
| Effects ★ | write cleanup + `AbortController` and diagram a race condition? | 4 | |
| Hooks | write `useDebounce/useCountdown/useLocalStorage` and test them? | 4, 12 | |
| Hooks | explain stale closures and the three ways to avoid them? | 4 | |
| Routing | design URL state for filters/sort/pagination and parse it safely? | 5 | |
| Routing | explain RR modes, layouts, guards (UX vs security), error boundaries? | 5 | |
| Structure | justify feature folders and enforce import boundaries? | 5 | |
| HTTP/API | read an API by status/headers/envelope and wrap it in a client layer? | 6 | |
| UX states | implement and test loading/empty/error/refreshing/partial states? | 6 | |
| Forms ★ | build a validated multi-step form with RHF + Zod and server-error mapping? | 7 | |
| Forms | handle async validation without races, and file previews without leaks? | 7 | |
| State | place any piece of state in the right home (local/URL/server/form/global)? | 8 | |
| Context | explain Context re-render behaviour and selector-based alternatives? | 8 | |
| Server state ★ | explain `staleTime` vs `gcTime`, keys, invalidation, optimistic updates? | 9 | |
| Server state | migrate hand-rolled fetching to Query and justify every default? | 9 | |
| Auth ★ | draw the token/cookie/rotation flow and defend each storage choice? | 10 | |
| Auth | implement single-flight refresh and safe redirects? | 10 | |
| Payments ★ | explain why webhooks, not callbacks, confirm payment, and idempotency? | 11 | |
| Realtime | manage a socket lifecycle with auth, cleanup and cache integration? | 11 | |
| Testing ★ | choose unit/integration/e2e for a feature and write behaviour tests? | 12 | |
| Testing | use MSW for failure paths and fake timers for time? | 12 | |
| Debugging ★ | use DevTools, React DevTools and a systematic method to find a bug? | 12 | |
| A11y | keyboard/screen-reader test a flow and fix axe issues? | 12 | |
| Performance ★ | measure with Lighthouse/Profiler and fix by evidence (LCP/INP/CLS)? | 13 | |
| Performance | explain `memo`, transitions, virtualization, code splitting trade-offs? | 13 | |
| Polish | implement theming, i18n/currency, SEO metadata, PWA safely? | 13 | |
| Production ★ | explain build vs dev, env baking, SPA fallback, cookie/CORS in prod? | 14 | |
| Delivery | set up CI, deploy three tiers, monitor errors, roll back? | 14 | |
| AI ownership ★ | explain any AI-assisted code you committed, and verify its APIs? | all | |

**Review cadence:** score at the end of Stages 4, 9, 12 and 14. For any row below 2, re-do that topic's Hands-on task from scratch with no AI, in a new branch.

---

## 9. Pacing

About **14 to 16 weeks** at roughly 10 to 12 hours per week. If you have more time, compress; if less, stretch, but do not skip Stages 4, 9, 10 and 12: they are the gap the plan exists to close.

| Week | Stage | Focus | Backend to request | Deliverable |
| --- | --- | --- | --- | --- |
| 1 | 0 + 1 (start) | Setup, DevTools, JS filters/sort | (B0 done) | env ping, explorer filters |
| 2 | 1 + 2 | `reduce` totals, async, TS domain types, generics | | `computeTotals`, typed `api()` skeleton |
| 3 | 2 + 3 | Zod, typed React, fundamentals refresh | | `ProductCard`, static PDP |
| 4 | 4 | Effects, fetch in effect, cleanup/race | | live list, debounced search |
| 5 | 4 | Custom hooks, timers, browser APIs, memo, bug-hunt | | countdown, recently viewed |
| 6 | 5 | Route tree, layouts, params | **B1** | all routes, shell |
| 7 | 5 | URL state, guards, errors, structure | | filtered listing in URL, 404 |
| 8 | 6 | API layer, CRUD, async states, infinite | **B2** | addresses, wishlist, pain journal |
| 9 | 7 | RHF + Zod, async validation, multi-step, upload | | login/register, checkout shell |
| 10 | 8 + 9 (start) | Context, Zustand, state audit; Query setup | **B3** | cart UI, products on Query |
| 11 | 9 | Mutations, optimistic, infinite, prefetch, polling | | cart/wishlist/orders on Query |
| 12 | 10 | Auth end to end | **B10** | real auth, verify/reset, Google |
| 13 | 11 | Cart finish, coupons/deals, place order | **B4, B5** | COD order end to end |
| 14 | 11 | Razorpay, orders/returns, reviews | **B6, B7** | paid order, reviews |
| 15 | 11 + 12 | Autocomplete, recs, sockets; testing | **B8, B9** | live notifications; unit/RTL/MSW tests |
| 16 | 12 + 13 | E2E, bug-hunt, a11y; performance, polish | **B12** | e2e suite, perf log |
| 17+ | 14 (+ Admin) | CI, deploy, Sentry, docs; SSR deep dive | **B11** (admin) | public URL, v1.0.0 |

**Buffer rule:** each stage ends with one buffer half-day. If you are behind by more than a week, drop stretches (not acceptance criteria) before dropping topics. If you are ahead, do the stretches marked **(recommended)**.

**Weekly review (15 minutes):** what did I finish, what is blocked, what did I not understand, what do I ask Claude for next (which backend phase)?

---

## 10. Guide resources and master link list

### From your guide (use one primary resource per topic)

| Resource | Use it for | Link |
| --- | --- | --- |
| React Learn (official) | Primary reference for components, state, events, hooks | https://react.dev/learn |
| React Reference (official) | Exact API behaviour of hooks and React APIs | https://react.dev/reference/react |
| SuperSimpleDev, React Tutorial Full Course (React 19, 2025) | Project-based pass over fundamentals, routing, backend data, testing, deployment, TS | https://www.youtube.com/watch?v=TtPXvEcE11E |
| PedroTech, ReactJS Beginner Course 2025 | Short practical intro (skim; you know this) | https://www.youtube.com/watch?v=3OqiKTyH4r0 |
| Maximilian Schwarzmüller, React: The Complete Guide (Udemy) | Reference course; use selected sections (effects, routing, forms, Query) | https://www.udemy.com/course/react-the-complete-guide-incl-redux/ |
| MDN JavaScript Guide | Language fundamentals, functions, arrays, promises, modules | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide |
| TypeScript Handbook | Everyday types, narrowing, generics | https://www.typescriptlang.org/docs/handbook/ |
| TypeScript: React | Typing components, hooks, events | https://www.typescriptlang.org/docs/handbook/react.html |
| React & TypeScript: The Practical Guide (Udemy) | Typed React in practice | https://www.udemy.com/course/react-typescript-the-practical-guide/ |
| Understanding TypeScript (Udemy) | Deeper TS (generics, decorators optional) | https://www.udemy.com/course/understanding-typescript/ |
| Vitest Guide | Test runner | https://vitest.dev/guide/ |
| React Testing Library | Component testing | https://testing-library.com/docs/react-testing-library/intro/ |
| MDN: first look at browser DevTools | Debugging basics | https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Tools_and_testing/Cross_browser_testing/Your_first_look_at_the_Browser_DevTools |

### Official docs by area

| Area | Links |
| --- | --- |
| React | https://react.dev/learn · https://react.dev/reference/react · https://react.dev/learn/you-might-not-need-an-effect · https://react.dev/reference/react/useEffect · https://react.dev/learn/react-compiler |
| React Router | https://reactrouter.com/ · https://reactrouter.com/start/modes · https://reactrouter.com/start/framework/routing · https://reactrouter.com/how-to/spa |
| TypeScript and Zod | https://www.typescriptlang.org/docs/ · https://zod.dev · https://react-typescript-cheatsheet.netlify.app/ |
| Forms | https://react-hook-form.com/ · https://github.com/react-hook-form/resolvers |
| Server state | https://tanstack.com/query/latest · https://tkdodo.eu/blog/practical-react-query |
| Client state | https://zustand.docs.pmnd.rs/ · https://react.dev/learn/scaling-up-with-reducer-and-context |
| UI | https://ui.shadcn.com/docs · https://base-ui.com/react/overview/quick-start · https://tailwindcss.com/docs · https://sonner.emilkowal.ski/ |
| Testing | https://vitest.dev · https://testing-library.com · https://mswjs.io/docs/ · https://playwright.dev/docs/intro |
| Payments | https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/ · https://razorpay.com/docs/payments/payments/test-card-details/ · https://razorpay.com/docs/webhooks/ |
| Real-time | https://socket.io/docs/v4/client-api/ |
| Performance | https://web.dev/articles/vitals · https://developer.chrome.com/docs/lighthouse/overview · https://tanstack.com/virtual/latest · https://motion.dev/docs/react |
| Accessibility | https://www.w3.org/WAI/WCAG22/quickref/ · https://www.w3.org/WAI/ARIA/apg/ · https://developer.mozilla.org/en-US/docs/Web/Accessibility |
| Web platform | https://developer.mozilla.org/ (Fetch, AbortController, Intl, IntersectionObserver, Web Storage, Service Worker, HTTP, CORS, Cookies) |
| Production | https://vite.dev/guide/build · https://docs.github.com/en/actions · https://docs.sentry.io/platforms/javascript/guides/react/ · https://www.mongodb.com/docs/atlas/ · https://vercel.com/docs · https://docs.docker.com/ |
| Admin track | https://tanstack.com/router/latest · https://tanstack.com/start/latest · https://tanstack.com/table/latest · https://recharts.org |

### A note on versions

This plan targets React 19.2, React Router 8 (framework tooling, SPA mode), TanStack Query v5, Zod 4, `@hookform/resolvers` 5, Vitest and Playwright current releases, Node 24. Library APIs move; when a snippet here disagrees with the official docs for your installed version, **the docs and your `package.json` win**. Check versions with `npm ls <pkg>` and read the changelog when something behaves unexpectedly.

*End of plan. Ship it.*
