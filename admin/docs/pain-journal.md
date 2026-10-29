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
