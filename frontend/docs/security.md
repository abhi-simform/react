# Frontend security checklist (10.9)

Every row was checked against this code base (how is in the last column). Status: ok = verified, plan = written down but not built.

| # | Item | Status | How verified |
| --- | --- | --- | --- |
| 1 | No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` anywhere in `app/` | ok | `grep -rn "dangerouslySetInnerHTML\|innerHTML\|eval(" app` finds nothing outside comments/scratch |
| 2 | XSS probe `<img src=x onerror=...>` and `<script>` in a review body and in the user name renders as inert text | ok | Submitted on a PDP (stub review list) and set as profile name through the API: the header, the review list show the literal text, `window.__xss` stayed unset, no `<img>`/`<script>` node was created |
| 3 | Access token only in memory; no token in localStorage/sessionStorage/URL | ok | Application tab: `shopsphere.hasSession` (boolean hint), `shopsphere.cartToken` (a cart NAME, not a credential), `shopsphere.recentlyViewed`; no JWT anywhere |
| 4 | Refresh token is `HttpOnly`, `SameSite=Lax`, path-scoped to `/api/v1/auth`; `Secure` in production (`COOKIE_SECURE=true`) | ok (Secure: config) | `curl -i` of login, `document.cookie === ""` |
| 5 | Tokens never logged | ok | grep for `console.*` in `features/auth`, `lib/api`: only `console.error` of Zod contract issues (paths and messages, no values of auth data); the only `console.log`s print form payloads in seller/review demo forms (no tokens, and passwords are never in those forms) |
| 6 | No secret in a `VITE_*` variable: the only ones are `VITE_API_URL` (public) and the optional `VITE_IDLE_MINUTES` | ok | `grep VITE_ app`; everything in `VITE_*` is shipped to every visitor |
| 7 | The dev password and the dev "sign in as role" panel are not in the bundle | ok | `grep -rn "Password123\|DEV_PASSWORD\|loginAsDevRole" app` is empty (they lived in `features/auth/session.ts` and `DevAuthPanel.tsx`, now deleted) |
| 8 | Post-login redirect only to same-origin relative paths | ok | `safeRedirect`: `?from=https://evil.com`, `//evil.com`, `/\evil.com`, `javascript:` all collapse to `/`; the API applies the same rule to Google's `redirect` |
| 9 | User-supplied URLs go through `lib/safeUrl.ts` before `href`/`src` (`javascript:`/`data:` rejected; http only in dev for images) | ok (avatar) | `AvatarUploader` uses `safeImageSrc`; seller/product image URLs must use it when B1/B11 let sellers type URLs |
| 10 | External links carry `rel="noopener noreferrer"` | ok | `externalLinkProps` in `lib/safeUrl.ts`; there is no `target="_blank"` link in the app today |
| 11 | One-time tokens (verify/reset) are removed from the address bar (`replace`) and the pages send `Referrer-Policy: no-referrer` (`<meta name="referrer">`) | ok | `/verify-email?token=...` becomes `/verify-email` immediately; checked in the browser |
| 12 | Role gating in the UI is courtesy only; the API enforces roles | ok | customer on `/seller`: 403 page AND `curl /seller/me` as customer = 403 |
| 13 | Logout clears the Query cache, the token, drafts; the cookie is cleared by the server | ok | Network + Application tabs, and the catalog still renders after `queryClient.clear()` |
| 14 | Session-sensitive responses are not cached across users (cache reset when the signed-in user changes) | ok | `SessionCacheSync` + `queryClient.clear()` on logout |
| 15 | Account enumeration: login says "Incorrect email or password"; forgot-password shows the same text for every email | ok | verified for a registered and an unregistered email (identical DOM text, mail only for the real one) |
| 16 | `npm audit` reviewed | ok (see below) | 9 findings, all inside the `shadcn` CLI's dependency tree (`@shadcn/registry`, `undici`, `body-parser`, `zod` copy, ...), none in code that ships to the browser; `shadcn` should move to `devDependencies` (not changed here, no dependency edits in this stage) |
| 17 | Third-party scripts | ok | none loaded: no analytics, no tag manager. Fonts are self-hosted (`@fontsource-variable/inter`) |
| 18 | Idle sign-out and cross-tab logout | ok | `IdleWarning`, `BroadcastChannel` (10.7) |

## CSP plan (not enforced yet: a header the backend/host sends; belongs to the deploy in Stage 14)

Start in report-only mode and tighten:

```
Content-Security-Policy:
  default-src 'self';
  script-src  'self' https://checkout.razorpay.com;      # Razorpay checkout script (Stage 11); NO 'unsafe-inline'
  frame-src   https://api.razorpay.com https://checkout.razorpay.com;
  connect-src 'self' <API origin> https://lumberjack.razorpay.com;  # + Sentry ingest host (Stage 14)
  img-src     'self' data: <images CDN / API uploads origin> https://*.googleusercontent.com;  # Google avatars
  style-src   'self' 'unsafe-inline';                    # Tailwind output is a file; inline style attrs from libraries
  font-src    'self';                                    # fonts are bundled, so no fonts.googleapis.com
  object-src 'none'; base-uri 'self'; form-action 'self' <API origin>;  # the Google flow navigates to the API
  frame-ancestors 'none'
```

Also `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff` (helmet already sends it from the API), `Permissions-Policy` for unused features. The Vite dev server needs inline scripts for HMR, so CSP is a production-build concern.

## Three ways XSS can still reach a React app

1. `dangerouslySetInnerHTML` (or `ref.innerHTML`) fed with unsanitised user content (rich-text reviews, CMS pages); fix: DOMPurify with a strict allow-list, or markdown rendered to React elements.
2. Dangerous URLs in attributes: `href="javascript:..."`, `src`/`formAction` from user data, `<a href={user.website}>`; fix: `safeHref`/`safeImageSrc`, CSP.
3. The supply chain and third-party scripts: a compromised npm dependency or an ad/analytics script runs with full page privileges (and can read the in-memory token); fix: lockfile + audit, few dependencies, SRI, CSP `script-src`. (Also: DOM XSS through `window.location`/`postMessage` data used unsafely, and server-rendered HTML that is not escaped.)

## Never

Never log tokens or passwords; never store credentials in `localStorage`; never put a secret in `VITE_*`; never trust client-side role checks; never use a user-supplied string as a URL, HTML or a redirect target without validating it.
