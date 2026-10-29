# Runbook

For whoever is holding the pager (including future you). Setup steps are in `../../DEPLOY.md`, variables in `environments.md`, error tracking in `observability.md`.

## Where things are

| What | Where |
| --- | --- |
| Storefront (static) | Vercel/Netlify project, or the `shopsphere-frontend` image (nginx, port 8080, `/healthz`) |
| API | Render/Railway service `shopsphere-api` (Docker, port from `PORT`), health `GET /api/v1/health` |
| Database | MongoDB Atlas cluster, database `shopsphere` |
| Redis (optional) | Render Key Value / Upstash; empty `REDIS_URL` = in-process cache, counters and jobs |
| Errors | Sentry project (frontend), release = git SHA |
| API logs | the host's log viewer; every line has `req.id` (= the `x-request-id` response header) |
| Uptime | two checks (API health, storefront) |

## Deploy

1. CI is green on the PR (`Frontend` and `Backend` workflows: checks, e2e, docker). Merge.
2. Backend first when the change is backwards compatible (the old frontend still works against the new API); frontend first when the frontend change only stops using something. A breaking change is split into two releases (expand, then contract).
3. Backend: the host builds the Dockerfile on push (or "Manual Deploy"). Watch the log for `API ready`, then `GET /api/v1/health`. A container that exits at once printed `Unsafe production configuration` or `Invalid environment configuration`: fix the variable named there.
4. Frontend: Vercel/Netlify build with `VITE_*` and `SENTRY_*` set; the build uploads source maps and deletes them. After deploy run the **smoke checklist** (`DEPLOY.md`, section 6), at least: login, refresh (still logged in), search, add to cart, `/debug/sentry` test error visible in Sentry.
5. Tag the release in git (`git tag vX.Y.Z`), update `CHANGELOG.md`.

## Roll back

See the table in `DEPLOY.md` section 7. Summary: frontend = promote the previous deployment (instant, no rebuild); backend = roll back to the previous deploy (code only, data is not rolled back: keep migrations backwards compatible for one release); database = restore a dump into a NEW database and switch `MONGODB_URI`.

## Rotate secrets

Always: generate the new value, set it in the host's secret store, redeploy, verify, THEN revoke the old one (except when the old one leaked: revoke first).

| Secret | Effect of rotation | Steps |
| --- | --- | --- |
| `JWT_ACCESS_SECRET` | every access token (15 min) becomes invalid; clients refresh transparently (the refresh cookie is a random value stored hashed in the DB, not a JWT) | set, redeploy; users notice nothing but one extra refresh |
| Refresh tokens (suspected theft) | forced sign-out | revoke by user/family in the DB (`refreshtokens` collection), or `deleteMany({})` to sign out everyone |
| `MONGODB_URI` password | API cannot connect until redeployed | create a second DB user, deploy with it, delete the old user |
| `RAZORPAY_KEY_SECRET` | payment creation/verification fail until updated | regenerate test key in the dashboard, update the variable, redeploy |
| `RAZORPAY_WEBHOOK_SECRET` | webhooks fail signature check until both sides match | update the webhook secret in Razorpay and the variable within the same minute; Razorpay retries failed deliveries |
| `GOOGLE_CLIENT_SECRET` | Google sign-in fails until updated | rotate in Google Cloud Console, update, redeploy |
| `SMTP_PASS` | e-mails fail (jobs retry 3 times with backoff) | update, redeploy; failed jobs can be re-enqueued from the queue/log |
| `SENTRY_AUTH_TOKEN` | the next build cannot upload maps (CI fails by design) | create a new token, update CI/host secret |
| `VITE_*` | not secrets | change, rebuild, redeploy |

If a secret was ever committed: rotate it first, then remove it from history (`git filter-repo`), then check `DEPLOY.md` section 8's scan.

## Incident playbooks

**Everyone is logged out on every reload (login "works" but does not persist).** The refresh cookie is not reaching `/auth/refresh`. Check in order: the response of `POST /auth/login` has `Set-Cookie`; `COOKIE_SECURE=true` only on HTTPS; `COOKIE_SAMESITE` is `lax` and the two hosts share a registrable domain (else `none` + Secure, which Safari/Firefox may still block); the frontend origin is in `CORS_ORIGINS` exactly (scheme, host, port); `COOKIE_DOMAIN` unchanged between releases (a different domain leaves the old cookie behind). `docs/environments.md` has the reproduction.

**Blank white page after a deploy.** Open the console. `Refused to execute inline script` = the CSP hashes do not match the built HTML (`npm run build` computes them; a hand-edited `vercel.json` or `_headers` does not). `Unexpected token '<'` on a script = a missing hashed file answered with HTML (the host's SPA rewrite swallows `/assets/*`): make missing assets 404. `Failed to fetch dynamically imported module` right after a deploy = an old tab asking for removed chunks: reload fixes it; a burst of these means a stale CDN cache of `index.html`.

**Errors spike in Sentry.** Open the newest issue: release tag (is it the latest deploy? then roll back), `context` tag (`route error boundary` = a page broke, `unhandledrejection` = an unawaited promise), `request_id` tag (search the API logs for it: the server side of the same request), breadcrumbs (what the user did). Scrubbed events have no e-mail or token by design; ask support for the "Reference" shown on the error page.

**API returns 5xx.** `GET /api/v1/health`: `db: "down"` = Atlas (cluster paused? network access list? credentials rotated?). Otherwise search the log for `req.id` of a failing call. Redis down: the API falls back to in-process caches/counters/jobs and logs a warning; with several instances rate limits and the cache become per-instance until Redis returns.

**Payments: order stays "pending payment".** Razorpay dashboard > Webhooks > recent deliveries: non-200 = the signature secret differs or the API was down (Razorpay retries); then check the API log for `webhook`. Unpaid online orders are cancelled automatically after `ORDER_EXPIRY_MINUTES` (stock released); the sweep logs each cancellation.

**E-mail not arriving.** Provider dashboard (bounces, unverified sender domain), API log `email` job failures (3 retries). Local development uses Mailpit (`http://localhost:8025`).

**Free-plan API sleeps (first request ~30 s).** Expected on Render's free tier; the uptime monitor keeps it warm at the cost of using the free hours.

## Backups and data

M0 has no backups: `mongodump` before risky changes (`DEPLOY.md` 1.6). Never run `npm run db:reset` against anything but a local database (it refuses a remote URI without a long explicit flag, and you should not pass it). Seed a fresh remote database once with `SEED_PASSWORD` set.

## Routine checks (weekly, 10 minutes)

Uptime history; Sentry unresolved issues; `npm audit` for both apps (the `shadcn` CLI findings are build-time only); expiring certificates (hosts renew automatically: look at the custom domain status); spending dashboards against the limits in `DEPLOY.md`.
