# Pain journal (Stage 6)

Every time the hand-written data layer made me repeat myself, duplicate a request or serve stale data, it goes here. Stage 9 ticks each line off when TanStack Query solves it. Format: **what hurt** (the ShopSphere moment that produced it).

## From 6.2 / 6.3: client layer and CRUD

- [ ] **Same boilerplate per resource: load, loading, error, abort, reload.** `useProducts`, `useProduct`, `useCategory`, `useAddresses`, `useWishlistProducts` all repeat "effect + AbortController + status + retry". (6.3: I rewrote the reducer for `useAddresses` and it looked 90% like `useAsyncResource`.)
- [ ] **Mutation then freshness is manual.** After `POST /addresses` I refetch by hand; after `PATCH`/`DELETE` I patch the list by hand. Nothing says "this mutation invalidates that list". A new mutation that forgets to patch leaves a stale list.
- [ ] **Server rules copied into the client.** Deleting the default address: the backend promotes the newest address and returns `newDefaultId`; my patch code re-implements that. If the rule changes, the UI silently lies until the next refetch.
- [ ] **Double-submit guard is hand-made** (a `Set` in a ref) in every mutating hook, because state updates are async and two clicks in one tick see the same stale `pending`.
- [ ] **Refresh-token rotation race.** `refreshSession()` needed a hand-written single-flight promise; a reload while a refresh is in flight (Vite full reload during dev) was enough to trip the backend's reuse detection and log me out. Every client has to rediscover this.

## From 6.4: wishlist

- [ ] **The same entity in many places needs a shared store I had to invent.** Heart on `ProductCard`, heart on the PDP, count in the header and the /wishlist grid all read a `WishlistContext` Set. Every other entity (a product on a card and on the PDP) has no such store.
- [ ] **Optimistic update + rollback by hand.** `toggle` changes the Set, calls the API, and on failure restores exactly one id. If a second change to the same id could happen meanwhile, a naive rollback would clobber it; I avoided that by ignoring toggles while an id is pending (a policy a library would let me choose).
- [ ] **Two sources of truth for "is it wishlisted".** The ids Set (`/wishlist/ids`) and the page list (`/wishlist`) are separate requests that I reconcile by filtering the list through the Set. Add from a card while /wishlist is open: the list does not know about the new item until a reload.
- [ ] **No cross-component cache invalidation when the user changes.** Signing out/in as someone else relies on a `userId` check I wrote by hand in `WishlistProvider`; forgetting it would show the previous user's hearts.
- [ ] **Failure UX is per-call code.** Each mutation writes its own `toast.error` message and rollback; there is no global place to say "mutations show a toast on error".
