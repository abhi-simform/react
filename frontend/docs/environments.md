# Environments, configuration, cookies and CORS (14.2)

Three environments: **local** (laptop), **staging** (optional; same config as production with its own database and test keys), **production**. This file lists every variable, who sets it, where, and whether it is a secret. The deployment recipe is `../../DEPLOY.md`; the config files are `../../render.yaml`, `../vercel.json`, `../netlify.toml`.

## Frontend variables (build time)

Vite replaces `import.meta.env.VITE_*` with constants **when `npm run build` runs**. They are in the JavaScript every visitor downloads: **never a secret**. Changing one means rebuilding (and, on Vercel/Netlify, redeploying); a runtime "restart" does nothing. The Docker image takes them as build arguments for the same reason.

| Variable | Local | Staging / production | Set by, where | Secret |
| --- | --- | --- | --- | --- |
| `VITE_API_URL` | `http://localhost:4000/api/v1` (`.env.local`) | `https://api.example.com/api/v1` | you; Vercel/Netlify "Environment Variables" (Build scope) or Docker `--build-arg` | no |
| `VITE_SITE_URL` | `http://localhost:5173` | `https://shop.example.com` | same; used for canonical URLs, Open Graph, `sitemap.xml` | no |
| `VITE_SENTRY_DSN` | empty (Sentry off) | the project's public DSN | same | no: a DSN is write-only and meant to be public |
| `VITE_RELEASE` | empty | the git SHA (CI sets it; hosts expose it as `VERCEL_GIT_COMMIT_SHA` etc.) | CI / host | no |
| `VITE_ENVIRONMENT` | empty (falls back to `mode`) | `production` / `staging` | same | no |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | empty (0) | `0.1` | same | no |
| `VITE_IDLE_MINUTES` | empty (default) | optional | same | no |

Build-time-only (never reach the browser, so they MAY be secret): `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` (source-map upload, 14.6). They are not `VITE_`-prefixed on purpose: Vite only exposes the prefixed ones. They live in the CI secret store / the host's build environment.

Check (acceptance 14.2): `npm run check:bundle-secrets` greps `build/client` for the patterns that must never ship (`JWT_`, `SECRET`, `sk_`, `rzp_...secret`, `mongodb://`, `BEGIN PRIVATE KEY`, the dev password) and fails the build if found. It runs in CI.

## Backend variables (runtime)

Validated once at boot by `backend/src/config/env.ts` (the process exits with a readable message when one is missing or malformed). In production they live in the host's secret store (Render "Environment", Railway "Variables"), never in git. `backend/.env.example` is the template for local.

| Variable | Local | Production | Secret |
| --- | --- | --- | --- |
| `NODE_ENV` | `development` | `production` (turns off the mock Google and the mock payment gateway) | no |
| `PORT` | `4000` | the host usually injects it (`PORT=10000` on Render) | no |
| `MONGODB_URI` | `mongodb://localhost:27017/shopsphere?replicaSet=rs0` | Atlas SRV string (`mongodb+srv://user:pass@cluster/shopsphere?retryWrites=true&w=majority`) | **yes** |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | explicit origins: `https://shop.example.com` (+ `https://admin.example.com`) | no |
| `CLIENT_URL` | `http://localhost:5173` | `https://shop.example.com` (links in e-mails, Google redirect target) | no |
| `JWT_ACCESS_SECRET` | dev placeholder | 48+ random bytes, different per environment | **yes** |
| `JWT_ACCESS_EXPIRES_IN`, `REFRESH_TOKEN_TTL_DAYS` | `15m`, `30` | same | no |
| `COOKIE_SAMESITE` | `lax` | `lax` on a shared parent domain, `none` only for the cross-site fallback | no |
| `COOKIE_SECURE` | `false` | `true` (HTTPS; mandatory with `SameSite=None`) | no |
| `COOKIE_DOMAIN` | empty (host-only) | usually empty; `.example.com` only if another subdomain must read it | no |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | empty (mock Google) | OAuth client; redirect URI `https://api.example.com/api/v1/auth/google/callback` | secret: the second |
| `GOOGLE_REDIRECT_URI` | localhost URL | the public API callback URL | no |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | empty (mock gateway) | **test-mode** keys; webhook URL `https://api.example.com/api/v1/payments/webhook` | the last two |
| `SMTP_HOST`, `SMTP_PORT`, `EMAIL_FROM` | Mailpit `localhost:1025` | a real provider (Resend/Brevo/SES SMTP) | host/port no; credentials are not wired yet (see limits) |
| `REDIS_URL` | empty (in-process) | Upstash/Render Redis `rediss://...` or empty for ONE instance | **yes** |
| `CACHE_ENABLED`, `CACHE_TTL_SECONDS`, `JOBS_ENABLED`, `ORDER_EXPIRY_*` | defaults | defaults | no |
| `UPLOAD_DIR`, `UPLOAD_MAX_BYTES` | `uploads`, 2 MB | a **persistent disk** path, or an object store (see limits) | no |
| `LOG_LEVEL` | `debug` | `info` | no |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` | empty | optional, for backend error tracking (not built: the API logs with pino and request ids) | DSN is public-ish |

## Domain strategy (decision) and why

**Chosen: a custom domain with subdomains of one registrable domain.** `shop.example.com` (static frontend on a CDN host) and `api.example.com` (the Node service). Browsers decide "same-site" by the registrable domain (eTLD+1), not the host, so a refresh cookie set by `api.example.com` for a page on `shop.example.com` is a **same-site** request: `SameSite=Lax` accepts it, third-party-cookie blocking does not apply, and the `HttpOnly; Secure` cookie keeps `path=/api/v1/auth`. CORS is still needed (different **origin**): `CORS_ORIGINS=https://shop.example.com` + `credentials: true`; the frontend already sends `credentials: "include"` on the auth calls.

**Fallback if there is no custom domain: proxy through the frontend host.** `vercel.json` rewrites `/api/*` to the API, so the browser only ever talks to `shop.vercel.app` (one origin: no CORS, a first-party cookie). Limits: Vercel rewrites do not proxy WebSocket upgrades (Socket.io must use the API origin directly, authenticated by the access token in the handshake, not by cookie, so that still works), and every API call pays an extra hop. Build with `VITE_API_URL=/api/v1` for this mode.

**Rejected: `*.vercel.app` + `*.onrender.com` talking directly.** Different registrable domains = cross-site. The cookie then needs `SameSite=None; Secure` and is a "third-party cookie": Safari (ITP) and Firefox partitioning drop it, Chrome's phase-out keeps changing. Login would "work" in one browser and silently loop on the refresh in another. It is fine for a demo in desktop Chrome and is documented as unsupported for real use. Set `COOKIE_SAMESITE=none COOKIE_SECURE=true` only for that demo.

### Why the cookie breaks cross-site (checkpoint answer)
The refresh request is a `fetch` from `app.vercel.app` to `api.onrender.com` with `credentials: include`. The cookie was set by `onrender.com`, so for a page on `vercel.app` it is third-party. With `SameSite=Lax` (the default) the browser does not attach it to a cross-site `fetch` at all, so `/auth/refresh` arrives without a cookie, answers 401, and every page reload logs the user out. Fixes: (1) put both on one registrable domain, (2) proxy the API under the frontend's origin; (3, weaker) `SameSite=None; Secure`, accepting third-party-cookie blocking.

## Preview deployments

Preview URLs (`shop-git-branch-team.vercel.app`) are **not** in `CORS_ORIGINS`, so they cannot call the production API with credentials: **unsupported on purpose**, because a wildcard origin with credentials would let any page on that host act as a logged-in user. To test a preview: point it at a staging API whose `CORS_ORIGINS` lists that ONE preview origin explicitly, or use the proxy mode above (`vercel.json` rewrites are per-deployment). The backend never reflects an arbitrary `Origin`, and has no wildcard.

## Local vs production differences that bite

- `COOKIE_SECURE=true` over plain `http://localhost` means the browser never stores the cookie: login "succeeds", the next refresh logs you out. Keep `false` locally.
- `NODE_ENV=production` disables the mock Google and mock payments: without real (test) keys the API refuses those routes, by design.
- The CSP `connect-src` is generated from `VITE_API_URL` at build time (`scripts/build-headers.mjs`): changing the API origin means rebuilding, which you already must do for the bundle.
- `Secure` cookies and the service worker both need HTTPS (localhost is exempt for the worker, not for `Secure`).
