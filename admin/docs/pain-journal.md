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
| A.4 | `canTransition` / `TRANSITIONS` (from the API) | Copied by hand into `features/orders/transitions.ts`; the storefront has its own `canCancel`. Three copies of the state machine now (API, storefront, admin): add a state and three files must change; only the API's is enforced. |
| A.4 | `socket.io-client` wiring (token in handshake, expiry, reconnect) | Rewritten smaller (staff events only). The storefront's realtime module has the same refresh-and-reconnect logic in a different shape. |
| A.4 | `Intl` date and rupee formatters | Fourth copy of `formatRupees`/date helpers across the two apps' modules. |
| A.5 | Banner image upload + same-site-path rule | The same `apiUpload` and the same regex exist in the API, the storefront and the admin: the rule "links stay on our own site" lives in three files. |
| A.5 | Rupee/date display helpers | `Intl.DateTimeFormat` + IST conversion helpers are new here; the storefront's countdown code has its own IST handling. A shared `@shopsphere/time` would have one tested implementation. |
| A.6 | `formatRupees` + a compact variant | Written a fourth/fifth time. The storefront's account page chart could not reuse the admin's Recharts code (no shared package, and the storefront should not pay for the library), so the two "spending/revenue" visualisations are separate implementations of the same idea. |
| A.7 | `can()` permission names vs the API's role checks | The permission map exists in the admin only; the API checks roles directly (`authorize("admin")`). Adding a role means editing both, and nothing forces them to agree: a UI permission can say yes while the API says 403. A shared, generated permission table would remove that. |
| A.7 | Audit `entity` names (products, orders, ...) | The list is typed in the API's Zod enum, again in `features/audit/api.ts`. |
| A.8 | `api()` client, 401 refresh logic | Writing the MSW test for "three parallel calls, one refresh" found a real bug in MY copy (the token was read when the 401 arrived, not when the request was sent, so a late 401 triggered a second, replayed refresh). The storefront's version had the right shape; I had "simplified" it away. A shared, tested client would have carried the fix once. |
| A.8 | Test harness (MSW handlers, render helpers, axe setup) | Third copy of "no retry QueryClient + MSW server + jest-dom"; MSW 3 renamed `onUnhandledRequest` to `onUnhandledFrame` here, the storefront still pins 2. |

## Five things I would extract into a shared package in a larger codebase, and why I did not

1. **API client + `ApiError` + paging envelope types** (`lib/api`): the highest-value one, the refresh bug above proves it. Not extracted: the plan forbids sharing, and the two apps differ in schema validation and download needs, so the first version of a shared client would have needed options for both.
2. **Order state machine (`TRANSITIONS`, `canTransition`, labels)**: three copies (API, storefront, admin). Best home: the API publishes it (a `/meta/order-transitions` endpoint or a generated file) and clients consume it. Not done: new backend surface was out of scope.
3. **Money and date formatting (`formatRupees`, IST day helpers)**: tiny, identical, bug-prone (time zones). Not extracted: ten lines each, and a package for them felt heavier than the copies.
4. **Auth/session module (in-memory token, single-flight refresh, role helpers, `can()` map)**: same logic, different shells. A shared package would also hold the permission table the API checks against.
5. **Generated API types from OpenAPI** (replacing hand-written `types.ts` in both apps): types are currently claims; they drifted once (variants, `productInfo`). Not done: the OpenAPI document is built from Zod at runtime, so generating TS needs a build step I did not add.
