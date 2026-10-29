# ADR 0006: Access token in memory, refresh token in an HttpOnly cookie

- **Status:** accepted (Stage 10); production cookie rules added in 14.2

**Context.** The SPA must stay signed in across reloads without exposing a long-lived credential to scripts. `localStorage` is readable by any script on the page (one XSS or one compromised dependency exfiltrates a 30-day token); a cookie the browser sends automatically brings CSRF questions.

**Decision.** The short-lived access token (15 min JWT) lives only in a module variable (`features/auth/session.ts`) and travels as `Authorization: Bearer`. The refresh token is a random value in an `HttpOnly; Secure; SameSite` cookie scoped to `Path=/api/v1/auth`, rotated on every use with reuse detection (a replayed old token revokes its whole family). After a reload the SPA calls `POST /auth/refresh` once (single-flight, so StrictMode and parallel requests share one call). CSRF is handled by scope: the cookie is only ever sent to `/auth/*`, those endpoints cannot be used to act (refresh returns a token only to a page the CORS allow-list trusts), and every state-changing API call needs the bearer header, which a cross-site form cannot set.

**Consequences.** (+) XSS can still use the token while the tab is open, but cannot steal a credential that outlives it; logout and rotation are server-enforced. (-) Every cold load pays one refresh round trip before private data can load. (-) The cookie only works when the API and the frontend are **same-site** (sibling subdomains) or proxied under one origin; `*.vercel.app` + `*.onrender.com` is cross-site and breaks (`docs/environments.md`, reproduced in 14.2). (-) A server-rendered page cannot see the session (the cookie belongs to the API origin); see ADR 0002.
