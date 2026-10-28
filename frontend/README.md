# React Router + shadcn/ui

This is a template for a new React Router project with React, TypeScript, and shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```

## How the frontend is organized

- `app/routes.ts` is the route tree; `app/routes/*` are THIN modules (param in, feature component out, plus `meta`/`handle`/`ErrorBoundary`). No business logic there.
- `app/features/<name>/` is one product capability (`catalog`, `product`, `cart`, `checkout`, `auth`, `search`, `deals`, `account`, `compare`, `orders`, `wishlist`). Inside: `components/`, `hooks/`, `api.ts`, `schemas.ts`, pure logic (`filters.ts`, `utils.ts`).
- Each feature has ONE public entry, `index.ts`. Other code imports `@/features/catalog`, never `@/features/catalog/components/...` (ESLint `no-restricted-imports` fails the build).
- Shared code is promoted only when a second feature needs it: `components/{ui,layout,common}` (UI), `hooks/` (generic hooks), `lib/` (API client in `lib/api/`, `format.ts` for prices and dates, `money.ts`, `paths.ts` for every URL).
- Where is price formatting? `lib/format.ts` (`formatRupees`, `formatCurrency`); the `Price` component is `components/common/Price.tsx`.
- Talking to the backend (Stage 6): components never call `fetch`. `lib/api/client.ts` exports `api<T>()` (envelope, `ApiError`, timeout + abort, bearer token via `configureApi`); each feature has an `api.ts` (`catalog/api.ts`, `wishlist/api.ts`, `account/addresses.api.ts`). Server state is read with `hooks/useFetch` (temporary: Stage 9 replaces it), and every async view goes through `components/common/AsyncView` (skeleton / empty / error / success). API data becomes view models in `features/catalog/mappers.ts` before it reaches a component. Pain points are logged in `docs/pain-journal.md`.
- Auth (Stage 10): real login/register/Google/verify/reset against the API. The access token lives in memory (`features/auth/session.ts`), the refresh token in an httpOnly cookie; the refresh is single-flight (shared promise + Web Lock) and `api()` retries a 401 once. Guards (`RequireAuth`, `PublicOnly`, `RequireRole`) read `useAuth()`; the return path travels in `?from=` and is validated by `safeRedirect`. There is no dev login any more: sign in with the seeded accounts through the normal form (`customer@shopsphere.dev`, `seller@...`, `admin@...`, password in `backend/docs/API-CONVENTIONS.md`). Token model and diagrams: `docs/auth-token-model.md`; checklist: `docs/security.md`. Dev-only: `/dev/auth` (single-flight lab), `VITE_IDLE_MINUTES` to shorten the idle sign-out. Google works with the backend's built-in mock until real credentials are added (see `backend/docs/API-CONVENTIONS.md`).
- `app/scratch/` and `/dev/*` are throwaway labs from earlier stages (dev builds only); `scratch/*.ts` are node-run checks (`npm run check:scratch`).
- Checks: `npm run typecheck`, `npm run lint`, `npm run check:scratch`, `npm run build`.
- Forms (Stage 7): every form is React Hook Form + a Zod schema (`zodResolver`; `useForm<z.input, unknown, z.output>` when the schema transforms or coerces). Schemas sit next to the feature (`features/auth/schemas.ts`, `features/account/schemas.ts`, ...), shared field rules in `lib/fields.ts` and `lib/imageFiles.ts`. UI pieces: `components/form/FormField` (label, hint, error, ARIA) and `FormError`; server errors are mapped with `lib/forms/applyApiError.ts`; double submits are blocked by `hooks/useSingleFlight`. Multi-step checkout = one `FormProvider` in the `/checkout` layout with a `sessionStorage` draft (`features/checkout`); pincode checks live in `features/delivery`; images (dropzone, previews, XHR upload with progress) in `features/uploads`.
- Server state (Stage 9): TanStack Query owns everything the server owns (`lib/query-client.ts`, key factories in `lib/queryKeys.ts`, `queryOptions` in each feature's `queries.ts`, freshness in `docs/query-policy.md`). The cart is server state behind `features/cart/useCart.ts` (guest = `x-cart-token`, user = JWT); Zustand keeps only UI flags (`cartUiStore.ts`). Retrospective: `docs/migration-retro.md`.
- State (Stage 8, partly superseded by Stage 9: the cart lines are no longer in Zustand): where each piece of state lives is in `docs/state-audit.md`. Context only for low-frequency values (`features/auth` AuthProvider, `features/theme` ThemeProvider, `features/toast` ToastProvider); the guest cart and the compare list are Zustand stores with `persist` (`features/cart/cartStore.ts`, `features/compare/compareStore.ts`; `skipHydration` + `components/common/StoresSync` so SSR-safe). Components select slices (`useCartStore(s => s.lines.length)`); totals are derived (`useCartTotals`). Undo toasts: `features/toast/undoToast.ts`.
