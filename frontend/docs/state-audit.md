# State audit (Stage 8.4)

Every piece of state in the storefront as of the end of Stage 8: where it lives now, where it
SHOULD live, and why. Six homes:

| Home | Use it for | Tools here |
| --- | --- | --- |
| **local** | one component (or a parent and its children) cares; dies with the component | `useState`, `useReducer`, `useRef` |
| **URL** | anything shareable, bookmarkable or Back-button-able | `useSearchParams`, route params |
| **server cache** | data the server owns (a cache of someone else's data) | hand-rolled `useFetch` now, TanStack Query in Stage 9 |
| **form** | values being edited, dirtiness, errors, touched | React Hook Form + Zod |
| **global client** | client-only state many distant components share | Zustand stores, Context (low-frequency only) |
| **persistent browser** | survives reload/restart (or dies with the tab) | `localStorage`, `sessionStorage` (always behind a store or hook) |

A seventh bucket is **derived**: not state at all, computed on render from the others.

Decision order: derive it? -> does the URL describe it? -> does the server own it? -> is it a
form? -> does one component care? (local) -> else global client.

Legend for the last column: OK = already right, MIGRATED = fixed in Stage 8 (commit named),
MIGRATED (9.x) = moved to TanStack Query in Stage 9 (the "where it lives now" column is the Stage 9 state), NOTE = right today, caveat explained.

| # | State | Where it lives now | Right home | Why (one sentence) | Status |
| - | ----- | ------------------ | ---------- | ------------------ | ------ |
| 1 | PDP selected variant (`selection`) | `useState` in `ProductDetailView` | local | Only the buy box reads it; `key={slug}` resets it per product. | OK |
| 2 | PDP quantity | `useState` in `ProductDetailView` | local | Same: a draft of "how many", clamped on render against stock. | OK |
| 3 | PDP chosen variant, price, stock message | computed in render (`findVariant`) | derived | A function of selection + variants; storing it would need syncing. | OK |
| 4 | Gallery image index | `useState` in `Gallery` | local | One component; nothing outside should remember it. | OK |
| 5 | PDP active tab (description / specs / reviews / Q&A) | Tabs' internal state | URL (`?tab=reviews`) | Linking to the reviews tab, reload and Back should work. | MIGRATED (8.4 migration 1) |
| 6 | "Write a review" editor open | `useState` in `ProductTabs` | local | Transient UI of one panel. | OK |
| 7 | Guest cart lines | Server cart via Query (`useCart`), guest token in `localStorage` | server cache (cart) + persistent browser (guest TOKEN only) | B3 gives guests a server cart too (token header); one facade hook hides the split. | MIGRATED (9.6) |
| 8 | Cart totals, savings, shipping, tax | `useCartTotals` (`useMemo` over `lines`) | derived | A second stored copy drifts on every action. | OK |
| 9 | Free-shipping progress | `freeShippingProgress(subtotal)` in render | derived | Function of the subtotal. | OK |
| 10 | Cart drawer open flag | Zustand `drawerOpen` (not persisted) | global client | Product cards' "View cart" toast action opens it from far away; a reload must not reopen it. | OK |
| 11 | Compare list (max 4) | Zustand `useCompareStore` + `persist` | global client + persistent browser | Cards, PDP, tray and page share it; it should survive a reload. | OK |
| 12 | Compare product data (prices, specs) | `useProductsByIds` = `useQueries` (one cached query per id) | server cache | Server data; the store keeps ids only, on purpose. | MIGRATED (9.2) |
| 13 | Compare "only differences" switch | `useState` in `CompareTable` | URL (`?diff=1`) | A view of the comparison worth sharing and surviving reload/Back. | MIGRATED (8.4 migration 2) |
| 14 | Wishlist ids | `wishlistKeys.ids()` query (`useWishlist`), Context deleted | server cache | It is server data living in a Context; Context should only deliver. | MIGRATED (9.5) |
| 15 | Wishlist "pending" ids | `useMutationState` over the membership mutation | mutation state | Bookkeeping of in-flight requests. | MIGRATED (9.5) |
| 16 | Wishlist product list (/wishlist page) | `useWishlistProducts` = `useQuery(wishlistQueries.list())` | server cache | Server data. | MIGRATED (9.2) |
| 17 | Address list | `useQuery(addressQueries.list())` | server cache | Server data; mutations should invalidate it. | MIGRATED (9.2, 9.4) |
| 18 | Address row pending/error | `useReducer` in `useAddresses` | local | Per-row mutation bookkeeping of one screen. | OK |
| 19 | Address dialog target (new / edit which) | `useState` in `AddressBook` | local | One dialog, one owner. | OK |
| 20 | Address form values and errors | React Hook Form | form | Dirty/touched/error state is exactly what RHF is for. | OK |
| 21 | Pincode input text | `useState` / RHF field | local / form | A draft value. | OK |
| 22 | Pincode serviceability result | `usePincodeCheck` over `useQuery(pincodeQueries.check)` | server cache | Server answer keyed by pincode; the hook also derives the 6 UI states. | MIGRATED (9.11) |
| 23 | Listing filters, sort, page, "more" mode | URL (`useProductFilters`) | URL | Shareable, Back-friendly; no `useState` copy exists. | OK |
| 24 | Price range draft text | `useState` in `PriceRangeFilter` | local | Typing must not hit the URL on every keystroke; commit on blur/Enter. | OK |
| 25 | Listing facets (kept while the next page loads) | `useInfiniteQuery` select / `placeholderData: keepPreviousData` (the `useState` copy remains for the sidebar) | server cache | A copy of server data held only to avoid a flash. | MIGRATED (9.3, 9.8); the facets `useState` copy is the one leftover: still a copy of server data, kept so the sidebar does not blank. NOTE |
| 26 | Listing results, categories tree, brands | `useQuery` (`productQueries`, `categoryQueries`, `brandQueries`) | server cache | Server data (the tree is nearly static: long stale time). | MIGRATED (9.1, 9.2) |
| 27 | Listing view preference (grid/list, default sort) | `useLocalStorage` in `useProductFilters` | persistent browser | A user preference, not shareable. | OK |
| 28 | Search box text, open flag, highlighted option | `useState` in `SearchBox` | local | Ephemeral UI of one widget; the committed search term goes to the URL. | OK |
| 29 | Search suggestions | `useQuery(searchQueries.suggestions(term))` | server cache | Server data keyed by term. | MIGRATED (9.11) |
| 30 | Recently viewed product ids | `useLocalStorage` | persistent browser | Pure client history. (Products shown from it are server cache.) | OK |
| 31 | Remembered delivery pincode | `useLocalStorage` | persistent browser | A user convenience. | OK |
| 32 | Auth status + user | Context (`AuthProvider`) | global client (Context) | Low-frequency, read everywhere; Stage 10 may feed it from Query `/auth/me`. | OK |
| 33 | Access token | module variable in `session.ts` | memory only | Never in storage (XSS); refresh cookie restores it. | OK |
| 34 | "Someone was signed in" hint | `localStorage` held the WHOLE user object | persistent browser, but only a flag | The user is server data: a stored copy goes stale (role changes); only the "ask the API" hint is needed. | MIGRATED (8.4 migration 3) |
| 35 | Theme choice (light/dark/system) | Context + `localStorage` | global client + persistent browser | Low-frequency app-wide value that survives reload. | OK |
| 36 | Applied theme (`light`/`dark`) | derived in `ThemeProvider` | derived | Choice + OS setting; never stored. | OK |
| 37 | Toast list | sonner's module store | global client (external store) | Fire-and-forget from anywhere; no Context value needed. | OK |
| 38 | Checkout form values (all steps) | RHF in `CheckoutShell` + `sessionStorage` draft | form + persistent (session) | One form across routes; a refresh should not lose it, a closed tab should. | OK |
| 39 | Checkout current step | URL | URL | Back/Forward and reload work. | OK |
| 40 | Checkout visited / completed steps | `useReducer` in the layout | local (layout) | Bookkeeping several components dispatch to; reducer keeps transitions in one place. | OK |
| 41 | Reducer `step` field | `StepperState.step` (mirror of the URL) | derived from URL | Duplicates the URL; kept only because 8.1 asks for it, and only used for `visited`. | NOTE |
| 42 | Return-to after login | router navigation `state.from` | URL/location state | Travels with the navigation, validated to same-origin. | OK |
| 43 | Coupon outcome (valid/expired/...) | `useState` in `CouponBox` | local now; the APPLIED coupon: global client (cart store) / server cart (S9) | The check result is a transient message; "which coupon is applied" must outlive the box. | NOTE (apply is S9) |
| 44 | Upload files and previews | `useState` + ref-counted object URLs | local + external store | Files are local drafts; object URLs are an external resource with a lifecycle. | OK |
| 45 | Avatar upload progress/status | `useState` in `AvatarUploader` | local | One component's async status (a mutation: Query `useMutation` in S9). | OK |
| 46 | Flash-sale countdown "now" | `useNow` (`useSyncExternalStore`) | external store | A shared ticking clock; server offset is server cache. | OK |
| 47 | Online/offline | `useOnlineStatus` (`useSyncExternalStore`) | external store | Browser API as a store. | OK |
| 48 | Desktop vs mobile layout | `useMediaQuery` | external store | Browser API as a store. | OK |
| 49 | Mega menu / mobile menu open | `useState` in each menu | local | Transient UI; closing on navigation is the component's job. | OK |
| 50 | Seller product form (variants, specs) | RHF `useFieldArray` | form | Dynamic rows with their own errors. | OK |
| 51 | Orders list / order detail | `orderQueries` over a stubbed API (`useInfiniteQuery`, polled detail) | server cache | Server data (Stage 11 backend + S9 Query). | MIGRATED (9.10; real API in Stage 11) |
| 52 | Compare table rows | `buildRows(products)` in render | derived | Function of the fetched products. | OK |

Counts: 52 items. Already right: 37. Migrated in Stage 8: 3 (5, 13, 34). Waiting for Stage 9
(server data held in hooks/Context): 10 (12, 14, 15, 16, 17, 22, 25, 26, 29, 51). Right today
with a caveat: 2 (41, 43). Items 7 and 43 have a Stage 9 part (logged-in cart, applied coupon).

## The three migrations done in Stage 8

1. **#5 PDP tab -> URL.** `ProductTabs` is controlled by `?tab=` (`replace`, so tab clicks do
   not fill the history). Default tab = no param, so canonical URLs stay clean.
2. **#13 Compare "only differences" -> URL.** `/compare?diff=1`.
3. **#34 Auth "remembered" hint -> a flag.** `localStorage` no longer holds the user object, only
   `"1"`; the user always comes from the API, so a role change or a deleted account is never
   shown from a stale copy.

## Defend each classification (one-liners)

- Local because only one component (or its direct children) reads it; global state would
  outlive the component and leak between pages.
- URL because someone might paste the link, press Back, or reload and expect the same view.
- Server cache because the server owns the truth; our copy has a freshness lifecycle
  (fresh/stale/refetching) that a `useState` does not model.
- Form because dirty/touched/errors/submitting are form problems with a form library.
- Global client because several DISTANT components read it and the server has no opinion
  (drawer flag, compare list, guest cart).
- Persistent browser because it must survive a reload (and it is only ever read through a store
  or hook, never scattered `localStorage` calls).
- Derived because it is a pure function of other state: storing it creates a sync bug.

## Stage 9 update (9.11)

Where the ten "waiting for Stage 9" items went: all ten are server-cache entries now (12, 14, 15,
16, 17, 22, 25 (partly), 26, 29, 51), plus the logged-in/guest cart (#7, now Query + a guest
token). New client state added in Stage 9, and why it is NOT server state:

| State | Home | Why |
| --- | --- | --- |
| Cart drawer open flag | Zustand `useCartUi` | Distant components open it (toast action); not persisted. |
| Per-line 409 warning (`lineMessages`) | Zustand `useCartUi` | Describes what happened to a user ACTION; cleared by the next success. |
| Guest cart token | `localStorage` (`cartToken.ts`) | Names a server cart; survives reload; is not the cart. |
| Pending quantity edits (timers, burst base) | module-level maps in `cartMutation.ts` | In-flight debounce bookkeeping that must outlive a re-render; not rendered. |
| Order list filters (`status`, `q`) | URL | Shareable/Back-friendly. |
| Review editor open | local `useState` (`ProductTabs`) | Transient UI of one panel. |

Boundary rule used all through Stage 9: **Query owns server state** (lines, wishlist ids, orders),
**Zustand/Context own client state** (drawer flag, theme, auth), **RHF owns form state**, **the URL
owns shareable state**. Where they overlapped (the cart lines lived in Zustand AND on the server;
the wishlist ids lived in a Context AND in an API) one side was deleted.
