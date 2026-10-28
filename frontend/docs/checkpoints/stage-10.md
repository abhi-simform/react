# Stage 10 checkpoint: model answers

**1. Why is the access token in memory and the refresh token in an httpOnly cookie? What does each protect against, and what remains exposed?**
Memory (a module variable) cannot be read through `localStorage`/`document.cookie`, so a script that runs later cannot lift the token and use it from another machine; it dies with the tab and is only 15 minutes long. The refresh token is the long-lived powerful one, so it lives where JavaScript cannot read it at all: an `HttpOnly` cookie scoped to `/auth`, sent by the browser only to the refresh endpoint, `Secure` and `SameSite` set. Still exposed: XSS can use the page while it is open (the app itself attaches the token; a script can even call `/auth/refresh`), CSRF on the refresh endpoint is limited by `SameSite`, POST-only and no parameters, and anyone who steals the refresh cookie from the machine gets one rotation before reuse detection reacts. The real fix for the XSS part is not allowing XSS (React escaping, no `dangerouslySetInnerHTML`, safe URLs, CSP).

**2. What is refresh-token rotation and why does a double refresh at startup log you out?**
Every refresh returns a NEW refresh token and marks the old one used. If a used token comes back, the server assumes theft and revokes the whole family. Two refreshes with the same cookie (StrictMode runs the effect twice, or two tabs) look exactly like that replay: the second arrives with the already-used token, so the family is revoked and the user is logged out. Fix: one shared in-flight promise per tab, a Web Lock across tabs.

**3. How do you make 6 parallel 401s produce one refresh?**
Keep `let refreshing: Promise | null`. The first 401 handler starts the refresh and stores the promise; the others `await` the same promise; `finally` resets it. Each request then retries ONCE with the new token (a flag or the structure of `send()` prevents loops), and a request whose 401 arrives after the refresh finished notices the token changed (compare the token it used) and just retries. If the refresh itself fails with 401, mark the session dead, log out, redirect, and do not start another refresh for the same dead token.

**4. Why must `from` be validated? Give an attack.**
It is user-controlled input used as a navigation target. `https://app/login?from=//evil.com` (or `https://evil.com`) in a phishing mail: after a genuine login the app redirects to a look-alike page that says "session expired, enter your password again". That is an open redirect. Accept only paths that start with a single `/` (reject `//`, backslashes, control characters, absolute URLs), and validate again server-side for the Google `redirect`.

**5. Why is client-side role gating not security?**
The bundle and its state run in the user's browser: anyone can edit localStorage, call `fetch` directly, or change `role` in a debugger. Hiding a menu item or showing a 403 page is user experience. The API must authorize every request from the verified token (`authorize("seller","admin")` returned 403 for the customer with `curl`, no UI involved).

**6. What happens to the Query cache at logout and why?**
It is cleared (`queryClient.clear()`) in addition to dropping the token: the cache holds the previous user's cart, wishlist, orders, addresses, and the next person on a shared computer (or the same tab logging in as someone else) must never see them, not even for a flash before the refetch. Public data (catalog) simply refetches.

**7. Describe the Google OAuth redirect sequence and who holds the secret.**
Browser -> `GET /auth/google` on OUR API; the API sets an httpOnly `state` cookie and redirects to Google with `client_id`, `redirect_uri`, scope and `state`; the user signs in at Google; Google redirects the browser to our API callback with `code` + `state`; the API checks `state` against the cookie (CSRF), exchanges the `code` with Google server to server using the `client_secret`, reads the verified email, finds/links/creates the user, sets our refresh cookie and redirects to the SPA, which does the normal silent refresh. The client secret exists only on the API; the browser sees redirects and cookies, never Google's tokens.
