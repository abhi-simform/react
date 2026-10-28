# Query freshness policy (Stage 9.3)

`staleTime` = how long data counts as FRESH (no refetch on mount, window focus or reconnect
inside that window). `gcTime` = how long INACTIVE data (no observer) stays in the cache after
the last observer unmounts; it is 5 minutes everywhere (the v5 default) and only starts
counting at that moment. The values live in `lib/query-client.ts` (`STALE`), and each
feature's `queries.ts` picks one, so the table below is the single place to read the policy.

| Data                                                           | `staleTime`                                       | Constant         | Why                                                                                                                                                                                              |
| -------------------------------------------------------------- | ------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Categories, brands, category detail, pincode zones             | 30 min                                            | `STALE.static`   | Change when an editor edits the catalog; the tree is read by 5 components.                                                                                                                       |
| Product lists, price histogram, search suggestions, home rails | 2 min                                             | `STALE.catalog`  | Prices and stock may move, but showing a list that is 2 minutes old is fine and makes list -> PDP -> back instant.                                                                               |
| Product detail (PDP buy box: price, stock)                     | 20 s                                              | `STALE.live`     | Stock and price decide a purchase; focus refetches after 20 s.                                                                                                                                   |
| Deals (`/deals`, home strip)                                   | 15 s, polled every 15 s                           | `STALE.deals`    | Real deals since B4. `refetchInterval: 15 s` keeps the "claimed" bar moving (paused in a hidden tab); at a deal's `endsAt` the deal, product and cart queries are invalidated (`useDealExpiry`). |
| Server clock offset (`GET /time`)                              | Infinity                                          | (inline)         | Measured once; `refetchOnWindowFocus: "always"` re-measures when the tab regains focus (a sleeping laptop or a changed OS clock is corrected).                                                   |
| Cart (incl. nested coupon list)                                | 5 s                                               | `STALE.cart`     | Mutation-driven, but another tab or device can change it; focus refetch keeps tabs consistent. Every cart mutation also writes or invalidates the cache.                                         |
| Orders (real API since B5)                                     | 30 s (+ 3 s polling while `pending_payment`, capped at 3 min; 10 s while active) | `STALE.orders`   | Status changes by events. Placing an order writes the created order into `orderKeys.detail` and invalidates the lists.                                                                           |
| Addresses, wishlist, profile                                   | 1 min                                             | `STALE.personal` | Only this user changes them, through our own mutations (which update the cache).                                                                                                                 |
| Health badge                                                   | 10 s                                              | (inline)         | A liveness probe.                                                                                                                                                                                |
| Reviews, review summary, Q&A                                   | 2 min                                             | `STALE.catalog`  | Public content. Each filter/sort has its own cache entry; a write by this user invalidates the product's whole reviews family and its detail (rating). Helpful/upvote are optimistic. |
| Review eligibility (can I write one?)                         | 1 min                                             | `STALE.personal` | Only changes through my own review actions, which invalidate it. |
| Payments (history, per-order failure reason)                   | 0                                                 | `STALE.none`     | Changed by gateway events (webhooks), so it is refetched whenever it is observed again.                                                                                                          |
| Notifications (Stage 11)                                       | 0                                                 | `STALE.none`     | Updated by sockets.                                                                                                                                                                              |

## Retries

`retry: shouldRetry` (lib/query-client.ts): at most 2 retries (backoff 1 s, 2 s), only for network
errors, timeouts and 5xx. Any 4xx is a final answer, so a 404 product shows the not-found
page at once instead of after ~3 s of pointless retries. Mutations never retry (default 0).

## Other triggers

- `refetchOnWindowFocus` and `refetchOnReconnect` stay ON (the defaults) for every query: they only fire when the data is stale, so `staleTime` is the throttle.
- `placeholderData: keepPreviousData` on the product listing (not on anything else): the old page stays visible, dimmed, with a thin "updating" bar while the next page or filter loads.
- Queries with `refetchInterval`: the order status (9.10, stops at a terminal status) and the deals lists (15 s, 11.2).
- Checkout revalidates the cart on entry: `useCart({ revalidate: true })` = `staleTime: 0` + `refetchOnMount: "always"` for that observer, and waits for `isFetchedAfterMount` (11.1).

## Observed behaviour (checked in the Network tab, see learning-notes 9.3)

See `learning-notes.md` section 9.3 for the measurements that match this table.
