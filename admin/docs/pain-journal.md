# Admin pain journal: what copying instead of sharing cost

`/admin` shares no code with `/frontend` (plan rule). Every entry: what I copied, how it hurt, what a shared package would have fixed.

| When | Copied from `/frontend` | The pain |
| --- | --- | --- |
| A.0 | `lib/api/errors.ts` (`ApiError`, `fieldErrors`), `getJson` fetch wrapper, `api()` | Had to re-read 400 lines to decide what to keep; I dropped response-schema validation, `apiWithMeta`, blob download and the request-id plumbing, so the two clients are already NOT identical after one afternoon. A bug fixed in one will not be fixed in the other. |
| A.0 | `lib/env.ts`, `QueryClient` defaults | The retry rule ("never retry a 4xx") exists twice. |
| A.0 | `cn()`/shadcn setup | The scaffold wired `cn` through the `cn` npm package and `shadcn add` keeps writing `import { cn } from "cn"`; fixed by hand in every generated file (same as the storefront, Stage 0.3). |
| A.1 | Token model: in-memory access token, single-flight refresh, `/auth/refresh` restore | Rewritten (shorter) rather than copied: the storefront version is tangled with its `AuthProvider`, cross-tab channel and cache sync. Result: two token implementations. Also the two apps share the SAME refresh cookie (both on `localhost`, ports do not isolate cookies): signing in to the admin as `admin@` in the same browser profile replaces the storefront's session cookie, and the next storefront reload is signed in as the admin. Real deployments (different sites) avoid it; locally use two browser profiles. |
| A.2 | `PageMeta`/envelope types | Duplicated again; the backend envelope is the only source of truth and neither app generates types from OpenAPI. |
| A.3 | `apiUpload` (XHR with progress) | Copied nearly verbatim. The 401-retry logic now exists in four places (two `api()`, two uploads). |
| A.3 | Money formatting | `Intl.NumberFormat("en-IN")` helper written a third time (storefront `money.ts`, plus this one). |

Five things I would extract into a shared package in a larger codebase are listed at the end of the track (A.8).
| A.4 | `canTransition` / `TRANSITIONS` (from the API) | Copied by hand into `features/orders/transitions.ts`; the storefront has its own `canCancel`. Three copies of the state machine now (API, storefront, admin): add a state and three files must change; only the API's is enforced. |
| A.4 | `socket.io-client` wiring (token in handshake, expiry, reconnect) | Rewritten smaller (staff events only). The storefront's realtime module has the same refresh-and-reconnect logic in a different shape. |
| A.4 | `Intl` date and rupee formatters | Fourth copy of `formatRupees`/date helpers across the two apps' modules. |
| A.5 | Banner image upload + same-site-path rule | The same `apiUpload` and the same regex exist in the API, the storefront and the admin: the rule "links stay on our own site" lives in three files. |
| A.5 | Rupee/date display helpers | `Intl.DateTimeFormat` + IST conversion helpers are new here; the storefront's countdown code has its own IST handling. A shared `@shopsphere/time` would have one tested implementation. |
