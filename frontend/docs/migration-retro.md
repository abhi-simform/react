# Migration retrospective (Stage 9.11)

From hand-rolled data fetching (`useFetch`, reducers, Contexts, a persisted Zustand cart) to
TanStack Query v5. Numbers are from this repository; where something was not measured it says so.

## 1. Hand-written fetching removed (the grep)

```
grep -rn "useFetch" frontend/app           -> only comments; hooks/useFetch.ts is deleted
useEffect + data fetching in feature code  -> none (the list below)
```

`useEffect` still appears in feature code, but none of it fetches server data into state:
`AuthProvider` (restores the session with the refresh cookie: auth, Stage 10 reworks it),
`CartSessionSync` (one-shot POST /cart/merge when a user signs in: a sync with the session, not a
data read; the result goes into the Query cache), `SessionCacheSync`, `AddressStep` (resets a
draft's stale address id), `CheckoutShell`/`PaymentStep` (form subscriptions), `Gallery`,
`ProductDetailView` (recently viewed -> localStorage), `ThemeProvider`, `DeliveryCheck`,
`AddressFormDialog` (form reset / busy callback), `LoadMoreSentinel` (IntersectionObserver).
The deliberately broken demos in `app/scratch/bugs/*` and `app/scratch/effects/*` keep their
hand-written effects on purpose (that is what they demonstrate).

## 2. Lines of code (frontend/app, non-scratch; `wc -l`, Stage 8 -> now)

| Piece | Before | After |
| --- | --- | --- |
| `hooks/useFetch.ts` | 112 | deleted |
| `useInfiniteProducts` (reducer, race guards) | 156 | 59 (adapter + select + status mapping; the query itself is ~12) |
| `useAddresses` | 157 | 142 (4 mutations + pending/error derivation; list read is one line) |
| `useSuggestions` (Map cache, abort) | 53 | 27 |
| `useProductsByIds` (effect, allSettled, abort) | 42 | 21 |
| `HealthBadge` | 48 | 35 |
| Cart: `cartStore.ts` (persisted lines) + `undo.ts` + `addToCart.ts` | 134 + 35 + 36 | `cartUiStore.ts` 54 (UI flags only); the server cart added `useCart` + `cartMutation` + `cart.api` + `cartToken` + `CartSessionSync` |
| `WishlistContext` (Set, pending, busy ref, rollback) | 154 | 157 (`useWishlist`: it now also does the cache-based optimistic update, undo and list patching) |
| `getCategoryTree` module promise cache | ~12 | 0 |

Honest net: the whole `frontend/app` (excluding scratch) grew by ~2,200 lines in this stage
(`git diff --stat stage-08-state-context`: 3,388 insertions, 1,210 deletions in 77 files), because
Stage 9 also ADDED features (server cart, orders, reviews, similar products, prefetching, key
factories, the policy). Hand-written fetching code specifically went down (see the table: `useFetch`, the
infinite-list reducer, the suggestion cache, the id loader, the category promise cache), but I did
not total it precisely. The
bigger win is not the count but what the lines have to get right: races, dedupe and staleness are
now the library's problem.

## 3. Requests saved: "home -> product -> back -> product"

Same flow, same browser profile, dev server (React StrictMode double-invokes effects, which
doubled the hand-rolled fetches), anonymous user, counted with the Performance API (`/api` fetches):

| | Before (Stage 8, `useFetch`) | After (Stage 9) |
| --- | --- | --- |
| Home page load | 24 (3 rails + deals + categories + health + 6 recently-viewed products, each ~twice) | 13 (**8** rails + deals + categories + health + 2 recently-viewed products; no duplicates) |
| product, back, product | 34 | 7 (the second visit made 0 product requests: cache hit) |
| **Total** | **58** | **20** |

Caveats: not production-mode counts (StrictMode inflates the "before" more); the home page has
more rails now (3 -> 8), so the like-for-like saving is larger than 58 -> 20; the recently-viewed
list differed between the runs (6 vs 2 ids); single run each, not averaged.

## 4. Bugs we can no longer have (by construction)

- Two components fetching the same URL (header + sidebar category tree): one key = one request.
- A slow response for an OLD filter overwriting the new one (stale `setState`): the key decides what a result belongs to.
- An infinite list mixing pages of two filter sets / duplicating items across pages.
- A mutation that forgets to refresh a list: invalidating by key prefix (`addressKeys.all`) covers every reader, including ones added later.
- Optimistic rollback clobbering unrelated changes (inverse write per product) and an optimistic value overwritten by an in-flight refetch (`cancelQueries`).
- A previous user's data flashing for the next user (`SessionCacheSync`).
- Out-of-order responses on rapid quantity changes (last mutation wins + debounce).
- Forgetting to abort on unmount: the `signal` is passed by Query.

New bugs we CAN have: a wrong or missing key (stale entry reused for different data), a user-scoped
key not added to `SessionCacheSync`, a `staleTime` that does not match the data's real volatility,
optimistic patches that diverge from the server's rules (the cart's `recount`), and `placeholderData`
shown as if it were real (guarded by `isPlaceholder`).

## 5. Pain journal

See `pain-journal.md`: 23 entries, each with a resolution: 18 solved, 2 partly solved (two
wishlist endpoints for one fact; per-rail skeleton heights), 3 still painful (scroll restoration of
infinite lists, the refresh-token single-flight, 401 handling in the fetch wrapper). The last two
belong to Stage 10, the first to Stage 13 or the persisted-cache stretch.

## 6. Not done / not measured

Stretch items (persisted query cache, `BroadcastChannel`, temporary line ids, route-chunk prefetch,
`maxPages`, `?include=` endpoint, backoff polling); real two-tab and real Slow-3G testing (simulated);
the hidden-tab pause of polling; the order and review APIs are stubs (B5/B7 land in Stage 11).
