# ADR 0004: TanStack Query for server state (after living with a hand-rolled hook)

- **Status:** accepted (Stage 9)

**Context.** Stages 6 to 8 used a hand-rolled `useFetch` (loading/error/data, abort on unmount, a user id in the deps). It worked for one screen and hurt at scale: no shared cache (the PDP and the listing fetched the same product twice), no request de-duplication, hand-written retry and refetch rules, optimistic updates by hand, and every new screen re-invented invalidation. `docs/pain-journal.md` lists the cases.

**Decision.** TanStack Query owns everything that comes from the server. Query keys come from one factory (`lib/queryKeys.ts`), freshness is a named table (`STALE` in `lib/query-client.ts`, reasons in `docs/query-policy.md`), 4xx errors are not retried, unexpected mutation failures share one toast, and user-scoped queries are reset when the signed-in user changes (`SessionCacheSync`). Zustand and Context hold only client state (ADR 0005).

**Consequences.** (+) One cache: placeholder data from a list makes the PDP paint at once; optimistic cart/wishlist updates roll back uniformly; far less code per screen. (+) The same cache can be seeded from a server loader (see ADR 0002, SSR experiment). (-) A mental model to learn (stale vs gc, keys as dependencies), a dependency of about 13 kB gzip, and a trap: with SSR the client must be created per request (`createQueryClient`), never a module singleton on the server. (-) Two caches interact with HTTP caching; the rule is written in `perf-log.md` (13.11).
