# ADR 0009: Error tracking behind `reportError`, compiled out without a DSN

- **Status:** accepted (14.6)

**Context.** Production errors must reach us with readable stacks, but a vendor SDK is 50+ kB gzip, a privacy risk, and unavailable in local development and in CI.

**Decision.** Components, boundaries and global handlers call `reportError` (`lib/report.ts`); it logs to the console and hands the error to `lib/observability.ts`, which is a no-op unless the BUILD has `VITE_SENTRY_DSN` (a compile-time flag, so the SDK is not even in the bundle otherwise). With a DSN the SDK loads lazily after the page `load`, events pass through `scrubEvent` (no e-mail, token, query string, cookie; the user is only `{ id }`), API failures carry the server's `x-request-id`, and source maps are produced and uploaded only when `SENTRY_AUTH_TOKEN` is present, then deleted from the public output.

**Consequences.** (+) Zero cost and zero data flow in local/CI builds; one place to change vendors; privacy rules are unit-tested. (-) A second build flavour exists (with/without DSN): the verification script (`npm run verify:sentry`) exercises the with-DSN one against a fake ingest. (-) Ad blockers hide events from some users (a `tunnel` would fix it; not built). (-) Not verified against a real Sentry project in this build.
