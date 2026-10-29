## What

<!-- One or two sentences: what changes and why. -->

## How I verified it

<!-- Commands you ran, pages you clicked, screenshots. "It compiles" is not verification. -->

## What I learned

<!-- Optional, but this repo is a learning record. -->

## Definition of Done

- [ ] Every acceptance criterion of the task is checked, and verified in the browser (not just "it compiles")
- [ ] `npm run check` passes in `frontend/` (format, lint, typecheck, unit tests, build); backend: `npm run lint && npm run typecheck && npm test`
- [ ] No `any` introduced without a comment explaining why
- [ ] No console errors or warnings in the browser (StrictMode stays on)
- [ ] Network tab inspected: no unexplained duplicate requests, waterfalls or failures
- [ ] Loading, error and empty states exist for everything that fetches
- [ ] Works at 360 px and 1280 px, and with the keyboard only
- [ ] Accessibility: axe e2e is green for any new page; focus order and labels checked
- [ ] No secret, `.env` file or token in the diff; nothing sensitive in a `VITE_*` variable
- [ ] Docs updated (README / `docs/` / ADR if a decision changed), and `CHANGELOG.md` for user-visible changes
- [ ] I can explain every line; AI-written parts were read, run and justified
