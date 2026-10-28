# Query freshness policy (Stage 9.3)

`staleTime` = how long data counts as FRESH (no refetch on mount, window focus or reconnect
inside that window). `gcTime` = how long INACTIVE data (no observer) stays in the cache after
the last observer unmounts; it is 5 minutes everywhere (the v5 default) and only starts
counting at that moment. The values live in `lib/query-client.ts` (`STALE`), and each
feature's `queries.ts` picks one, so the table below is the single place to read the policy.

| Data | `staleTime` | Constant | Why |
| --- | --- | --- | --- |
| Categories, brands, category detail, pincode zones | 30 min | `STALE.static` | Change when an editor edits the catalog; the tree is read by 5 components. |
| Product lists, price histogram, search suggestions, home rails | 2 min | `STALE.catalog` | Prices and stock may move, but showing a list that is 2 minutes old is fine and makes list -> PDP -> back instant. |
| Product detail (PDP buy box: price, stock) | 20 s | `STALE.live` | Stock and price decide a purchase; focus refetches after 20 s. |
| Flash-sale strip | 15 s | `STALE.deals` | Deal accuracy (real deals arrive with B4). |
| Cart | 5 s | `STALE.cart` | Mutation-driven, but another tab or device can change it; focus refetch keeps tabs consistent. Every cart mutation also writes or invalidates the cache. |
| Orders | 30 s (+ 5 s polling while the order is not final) | `STALE.orders` | Status changes by events. |
| Addresses, wishlist, profile | 1 min | `STALE.personal` | Only this user changes them, through our own mutations (which update the cache). |
| Health badge | 10 s | (inline) | A liveness probe. |
| Notifications (Stage 11) | 0 | `STALE.none` | Updated by sockets. |

## Retries

`retry: shouldRetry` (lib/query-client.ts): at most 2 retries (backoff 1 s, 2 s), only for network
errors, timeouts and 5xx. Any 4xx is a final answer, so a 404 product shows the not-found
page at once instead of after ~3 s of pointless retries. Mutations never retry (default 0).

## Other triggers

- `refetchOnWindowFocus` and `refetchOnReconnect` stay ON (the defaults) for every query: they only fire when the data is stale, so `staleTime` is the throttle.
- `placeholderData: keepPreviousData` on the product listing (not on anything else): the old page stays visible, dimmed, with a thin "updating" bar while the next page or filter loads.
- No query uses `refetchInterval` except the order status (9.10).

## Observed behaviour (checked in the Network tab, see learning-notes 9.3)

See `learning-notes.md` section 9.3 for the measurements that match this table.
