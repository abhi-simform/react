# ADR 0001: Organize by feature, share by promotion

**Context.** The app grows past 100 files. Grouping by file type (`components/`, `hooks/`, `utils/`) scatters one capability (catalog) over five folders and makes every change touch all of them.

**Decision.** Group by feature under `app/features/<name>/`. Route modules stay thin. Shared code (`components/`, `hooks/`, `lib/`) is created only when a SECOND feature needs it. Each feature exposes one public `index.ts`; ESLint (`no-restricted-imports`) forbids importing another feature's internals.

**Consequences.** (+) Changes stay local, features can be read and deleted as a unit, the lint rule keeps coupling visible. (+) A new teammate finds "price formatting" in `lib/format.ts` and "filters" in `features/catalog`. (-) Barrel files need upkeep and pull a feature's whole export list into the import graph (fine for tree-shaken ES modules, but watch it for route chunks). (-) Deciding what is "shared" is a judgement call; when in doubt keep it in the feature.
