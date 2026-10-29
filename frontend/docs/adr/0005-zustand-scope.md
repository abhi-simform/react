# ADR 0005: Zustand only for small client-side UI state; everything else has a more specific home

- **Status:** accepted (Stage 8)

**Context.** `docs/state-audit.md` sorted every piece of state into six homes: local, URL, server cache, form, global client, persistent browser. The question was what deserves a global store.

**Decision.** Zustand holds only client-only state that many distant components share and that is not derived from the server or the URL: the compare tray (`features/compare/compareStore.ts`) and the cart drawer's UI state (`features/cart/cartUiStore.ts`). Selectors are mandatory (`useStore(s => s.x)`), stores are plain modules, persistence goes through a small helper (`lib/persistSync.ts`). Not in a store: server data (Query), filters and pagination (the URL), form values (React Hook Form), the theme, locale and auth session (low-frequency Context providers).

**Consequences.** (+) A small, auditable surface: two stores. Filters survive a shared link because they never left the URL. (+) The 8.x lab (`scratch/zustand`) kept the legacy version beside the fix as a record. (-) Context re-renders every consumer when its value changes, so the providers are kept low-frequency and small (no mega-context). (-) A store is a module singleton: with SSR it would be shared between requests, so a store that holds user data must not be created at module scope on the server (today's two stores hold no user data).
