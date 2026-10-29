# ADR 0008: Ship the storefront as static files; generate the security headers per build

- **Status:** accepted (14.1 to 14.3, 14.5)

**Context.** The SPA build is static files; the hosts (nginx, Vercel, Netlify, any CDN) differ in how they take headers. The Content-Security-Policy has two parts that change per build: the API origin (`connect-src`) and the SHA-256 of every inline script (React Router's bootstrap scripts, the theme script). A hand-pasted hash and a hard-coded API URL were wrong in 13.7 and the policy was never actually served until 14.1, where it blanked the page.

**Decision.** `public/_headers` is the one template. `scripts/build-headers.mjs` (run by `npm run build`) fills it from `VITE_API_URL`, `VITE_SENTRY_DSN` and the built HTML, writes `build/client/_headers` (Netlify, Cloudflare Pages, `npm start`), `build/nginx-headers.conf` (the Docker image) and, on request, `vercel.json`. `npm start` is a small Node static server that applies the same file; the Docker image is nginx-unprivileged with `try_files` to the SPA shell and long immutable caching for `/assets`, `no-cache` for the shell and the service worker.

**Consequences.** (+) The policy always matches the build, a missing asset is a 404 (not HTML), and the e2e suite runs against the same headers a host sends. (+) The image has no Node runtime (25 MB). (-) `vercel.json` is generated and committed (Vercel reads it before the build). (-) Changing the API origin means rebuilding the frontend, as VITE variables already require. (-) A per-request inline script (SSR) cannot use hashes; it would need a nonce (ADR 0002).
