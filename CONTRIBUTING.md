# Contributing

## Branching and commits

- One branch per piece of work, named for what it does (`stage-14-production`, `fix/cart-merge`). `master` stays the untouched starting point of this repository; stages build on each other and are tagged `stage-NN-done`; the storefront release is tagged `v1.0.0-storefront`.
- One commit per topic, imperative, prefixed with the topic or area: `14.6 Observability: ...`, `backend B6: ...`. A commit is a reviewable unit that builds and passes the checks.
- Never commit `.env` files, secrets, `node_modules`, `build/`. The pre-commit hook (installed by `npm install` in `frontend/`) formats and lints staged TypeScript; bypass only in an emergency (`--no-verify`) and say so in the PR.

## Before you open a PR

```bash
cd frontend && npm run check            # format, lint, typecheck, unit/component tests, build
cd frontend && npm run e2e              # needs docker compose up -d; ~2 minutes
cd backend  && npm run lint && npm run typecheck && npm test
```

CI runs the same commands (`.github/workflows`). Branch protection should require `Frontend / checks`, `Frontend / e2e`, `Frontend / docker`, `Backend / checks`, `Backend / docker`.

## Definition of Done

The checklist in `.github/pull_request_template.md` is the source of truth. In short: acceptance criteria verified in the browser (not "it compiles"); typecheck clean and no `any` without a comment; no console errors or unexplained network requests; loading, error and empty states; works at 360 px and 1280 px and with the keyboard only; accessibility checks green; no secret in the diff and nothing sensitive in a `VITE_*` variable; docs and `CHANGELOG.md` updated; you can explain every line (AI-assisted code included).

## Conventions

- `frontend/app/features/<name>/` per product capability, one public `index.ts`, no imports of another feature's internals (ESLint enforces it); `lib/` never imports `features/`.
- Components never call `fetch`: feature `api.ts` -> `lib/api`. Server state is TanStack Query; filters live in the URL; Zustand is for small client-only UI state (ADR 0005).
- Zod comes from `@/lib/zod`. Errors go through `reportError`. Money is integer rupees from the API; display goes through `lib/format.ts`.
- Prettier, no semicolons; named exports; thin route modules.
- A new environment variable: add it to `frontend/docs/environments.md` (and `backend/.env.example` / `src/config/env.ts`), say whether it is secret, and never prefix a secret with `VITE_`.
- A decision someone will ask about later: write an ADR in `frontend/docs/adr/` (context, decision, consequences, status).

## Releasing

Follow `frontend/docs/release-checklist.md`, update `CHANGELOG.md`, tag, and keep the rollback notes in `DEPLOY.md` accurate.
