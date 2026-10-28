# Pain journal (Stage 6)

Every time the hand-written data layer made me repeat myself, duplicate a request or serve stale data, it goes here. Stage 9 ticks each line off when TanStack Query solves it. Format: **what hurt** (the ShopSphere moment that produced it). 22 entries, grouped.

## A. Caching and sharing between components

- [ ] **No cache between pages.** Open a product from the listing and the PDP fetches `/products/:slug` although the card already held most of that data; go Back and the listing refetches page N from scratch (skeleton again). (`useProducts`, `useProduct`)
- [ ] **The same product is fetched by the card and the PDP, under two shapes.** List item vs detail item are separate requests with separate schemas (`productSchema`, `productDetailSchema`), and nothing links them: no "I already have this, show it instantly and refresh in the background".
- [ ] **Two components mounting `useFetch` for the same URL send two requests and hold two states.** Each `useFetch` call owns its own state. Header menu + filter sidebar both need the category tree: I had to hand-write a module-level promise cache in `getCategoryTree()` (and remember to clear it on failure) to avoid two requests. Worse, after a `setData` patch in one, the other still shows the old data (they cannot disagree about the wishlist ids only because I built a context for them).
- [ ] **The same entity in many places needs a shared store I had to invent.** Heart on `ProductCard`, heart on the PDP, count in the header and the /wishlist grid all read a hand-made `WishlistContext` Set. Every other entity has no such store.
- [ ] **Two sources of truth for "is it wishlisted".** `/wishlist/ids` (the Set) and `/wishlist` (the page list) are separate requests reconciled by filtering the list through the Set. Add from a card while /wishlist is open: the list does not know the new item until a reload.

## B. Freshness: refetching, retry, invalidation

- [ ] **No refetch on window focus or reconnect.** Leave the wishlist open, change it on another device or tab: nothing updates until I reload. The offline banner returns, but the failed rail stays failed until someone presses Retry.
- [ ] **No automatic retry.** A transient 502 or a dropped packet on the home rails shows the error state immediately; every retry is a button I wrote (`ErrorState onRetry`). No backoff, no "retry 3 times for network errors only".
- [ ] **Mutation then freshness is manual.** After `POST /addresses` I call `reload()`; after `PATCH`/`DELETE` I patch the list by hand with `setData`. Nothing says "this mutation invalidates that list". A new mutation that forgets to patch leaves a stale list.
- [ ] **Server rules copied into the client.** Deleting the default address: the backend promotes the newest address and returns `newDefaultId`; my patch code re-implements that. If the rule changes, the UI silently lies until the next refetch.
- [ ] **Stale data on a user switch had to be handled by hand.** Signing out and in as someone else works only because the user id is in `useFetch`'s dependencies; a hook that forgets it would show the previous user's addresses.

## C. Mutations and optimistic updates

- [ ] **Optimistic update + rollback by hand.** `toggle` changes the Set, calls the API, and on failure restores exactly one id. A naive rollback (restore a snapshot of the whole Set) would clobber changes made meanwhile; I avoided that by ignoring toggles while an id is pending, a policy a library would let me choose.
- [ ] **Double-submit guard is hand-made.** A `Set` in a ref in `useAddresses` and in the wishlist provider, because state updates are async and two clicks in one tick see the same stale `pending`.
- [ ] **Per-row pending/error bookkeeping.** `pending` and `rowErrors` maps in a reducer, plus the same idea again for the wishlist (`pending` Set). Each mutation hook reinvents it.
- [ ] **Failure UX is per-call code.** Each mutation writes its own `toast.error` and rollback; there is no one place to say "mutations show a toast on error".

## D. Loading states and flashes

- [ ] **Loading flash when paging or filtering.** A new filter or page is a new `useFetch` key, so the grid drops to the skeleton and back (I added `keepPrevious` to `useFetch` only for the case where I opt in; the listing does not use it, because mixing old items under new filters would be wrong without a clear "updating" signal).
- [ ] **No global "something is loading" indicator.** Each `AsyncView` shows its own skeleton; there is no top progress bar or `isFetching` count because there is no central place that knows about in-flight requests.
- [ ] **Per-section loading means N skeletons and layout negotiation.** The home rails each render their own skeleton; matching their height to the loaded content is manual (measured 1917px vs 2073px for the listing).

## E. Pagination

- [ ] **Pagination merge is hand-written.** `useInfiniteProducts` is a reducer with page tags, key tagging, dedupe by id, a busy ref and an abort controller (about 150 lines) to do what `useInfiniteQuery` does in a few options. Every race I thought of (filter change during page 3, duplicate sentinel triggers, error on page N) needed explicit code and a manual test.
- [ ] **Back button does not restore a scrolled infinite list.** Loaded pages live only in component state; a stretch would need `sessionStorage` by hand.

## F. Auth and plumbing

- [ ] **Refresh-token rotation race.** `refreshSession()` needed a hand-written single-flight promise; React StrictMode (and a reload while a refresh was in flight, seen once with a Vite full reload) can trip the backend's reuse detection and log you out. Every client has to rediscover this.
- [ ] **401 handling lives in the fetch wrapper, not in the data layer.** `onUnauthorized` retries once, but any request that is NOT `auth: true` silently skips it, and two parallel 401s would each start a refresh (the single-flight only protects `refreshSession`, not the retry logic itself).

## G. Observability

- [ ] **No devtools visibility.** I cannot see which requests are in flight, cached, stale or why something refetched, except by wrapping `fetch` in the console (which is how I verified the Stage 6 behaviour).
- [ ] **Every hook re-types its boilerplate: `useFetch` deps must be JSON-able.** `useFetch` serialises its dependencies; a Date, a function or a cyclic object in `deps` silently misbehaves, and the keys are free-form strings with no factory, so two hooks can collide by accident.

## What `useFetch` answers

"What breaks if two components mount `useFetch` for the same URL?" Two requests go out (no de-duplication), two independent states exist (two loading flashes, possibly two different results if the data changes between responses), and a mutation that patches one with `setData` leaves the other stale. That is why the wishlist needed a context and the category tree a module-level promise.
