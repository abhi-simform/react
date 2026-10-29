# ADR 0003: A thin `fetch` wrapper instead of axios

- **Status:** accepted (Stage 6, revisited in 14.7)
- **Date:** Stage 6; reviewed at the release

**Context.** Every API call needs the same things: the response envelope (`{ success, data, meta }`), one error type, a timeout, the caller's abort signal, a bearer token, and a single refresh-and-retry on an expired token. axios gives interceptors, JSON handling and cancellation out of the box; native `fetch` gives none of them but ships with the browser, and its `Response` object is what React Router, service workers and server runtimes already speak.

**Decision.** `lib/api/getJson.ts` is the only place that calls `fetch` (timeout via `AbortSignal.timeout`, merged with the caller's signal via `AbortSignal.any`, every failure turned into an `ApiError`). `lib/api/client.ts` adds the envelope, the token and the one retry (`configureApi` injects the token getter and the refresh callback so `lib/` never imports a feature). A CI-visible rule keeps it that way: components call feature `api.ts` functions, never `fetch`. (The SSR experiment added a second `fetch` in a server-only file because it needs response headers: `lib/serverApi.server.ts`.)

**Consequences.** (+) No dependency, about 150 lines we understand completely, the same `fetch` semantics everywhere (including the service worker and the Node server). (+) Cancellation and timeouts are standard web APIs. (-) We wrote what axios gives for free (retry, interceptors, upload progress: `upload.ts` uses XHR for progress because `fetch` still has no upload progress events). (-) New developers expect axios; the wrapper must stay small and tested (`app/test/network`). Revisit if we need request/response transformation chains or upload progress in many places.
