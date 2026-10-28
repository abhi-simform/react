# Accessibility audit (Stage 12.9), target WCAG 2.2 AA

Pages audited: home, listing, PDP, cart, checkout (address, delivery, payment, review), login, account.

## How it is checked now (so it stays fixed)

| Check | Where | Gate |
| ----- | ----- | ---- |
| axe, WCAG 2.0/2.1/2.2 A+AA rules, in a real browser, on every audited page | `e2e/a11y.spec.ts` | zero serious/critical (others are printed) |
| axe on components in jsdom (names, roles, labels, ARIA validity) | `app/test/a11y.test.tsx` (`vitest-axe`) | zero violations |
| `jsx-a11y` lint rules | `eslint.config.js` | `npm run lint` |
| Keyboard only: skip link, dialog focus stays inside, Escape closes, focus returns to the opener | `e2e/a11y.spec.ts` | pass |
| Every tab stop on `/login` and the listing has a visible focus style | `e2e/a11y.spec.ts` | pass |
| Reflow: no horizontal scroll at 320 px and 360 px (home, listing, cart, login), and at 640 px (what 200% zoom of a 1280 px window gives) | `e2e/a11y.spec.ts` | pass |
| `prefers-reduced-motion`: the hero carousel does not autoplay | `e2e/a11y.spec.ts` | pass |
| Contrast of the theme tokens, light and dark | `e2e/contrast.spec.ts` | text pairs >= 4.5:1, focus ring >= 3:1 |

## Issues found and fixed

| # | Where | Problem (rule) | Found by | Fix |
| - | ----- | -------------- | -------- | --- |
| 1 | Cart lines (`QuantityStepper`) | Every line's buttons were named "Increase quantity": indistinguishable in a list (WCAG 2.4.6, 4.1.2) | RTL `getByRole` found several | name carries the product: "Increase quantity of X" |
| 2 | `CartLineRow` | "Remove / Save for later / Move to cart" named by a visually-hidden span: the name read "RemoveNoise..." with no space | RTL accessible-name | explicit `aria-label="Remove X"` |
| 3 | `ui/button.tsx` | A button rendering a router `<Link>` was exposed as `role="button"` ("View cart, button" for a navigation) (4.1.2) | RTL `getByRole("link")` failed | `role="link"` when the rendered child is a Link |
| 4 | Header bell | Visible text "Bell", accessible name "Notifications, 5 unread": label-in-name mismatch (2.5.3) | axe `label-content-name-mismatch` | icon only (`aria-hidden`), name kept |
| 5 | Hero carousel dots | 12 px targets (2.5.8 target size, AA in 2.2) | axe `target-size` | 24 px button around the 12 px dot |
| 6 | Out-of-stock cards | text dimmed with `opacity-60`: contrast under 4.5:1 (1.4.3) | axe `color-contrast` | no opacity on text (image only); the state is also said in words |
| 7 | PDP "Related products" | link rows too close/small (2.5.8) | axe `target-size` | `min-h-6` block links |
| 8 | Checkout delivery slots | 13 px native radios (2.5.8) | axe `target-size` | `size-6` radios |
| 9 | Checkout review | `<dl>` with a `<div>` holding dt, dd AND a link: invalid structure (1.3.1) | axe `definition-list` | the link lives in the `<dd>`; "Change address / delivery / payment" names |
| 10 | Listing toolbar | overflowed by 57-97 px at 320-360 px (1.4.10 reflow) | reflow test | `flex-wrap` |
| 11 | Theme `--muted-foreground` (light) | 4.25:1 on white, 3.86:1 on `--muted` (1.4.3) | contrast spec | `oklch(0.58 ...)` -> `oklch(0.5 ...)` (5.95 / 5.39) |
| 12 | Theme `--ring` (light) | focus ring 2.3:1 against the background (1.4.11) | contrast spec | `oklch(0.737 ...)` -> `oklch(0.58 ...)` (4.25) |

Measured contrast after the fix (light / dark): foreground 19.6 / 18.9, primary-foreground on primary 5.1 / 7.2,
muted-foreground on background 5.9 / 8.4, destructive on background 4.8 / 6.8, ring on background 4.3 / 4.6.

## What is already right (verified, not changed)

- Landmarks (`banner`, `nav`, `main`, `contentinfo`), a skip link that moves focus to `main`, and a live
  region that announces route changes (`useRouteFocus`).
- Forms: every field has a label; errors are `role="alert"`, linked with `aria-describedby`, `aria-invalid`,
  and the first invalid field is focused (RTL tests in `LoginForm.test.tsx`, `AddressFormDialog.test.tsx`).
- Dialogs/drawers/popovers (base-ui): focus moves in, stays in, Escape closes, focus returns (cart drawer
  test, Playwright keyboard test). Search suggestions follow the ARIA 1.2 combobox pattern.
- Carousel: pause control, `prefers-reduced-motion`, off-screen slides `inert`.

## NOT done / limits (be honest)

- **Screen reader pass (VoiceOver) was NOT performed**: no screen reader can be driven from this environment.
  The markup follows the patterns (names, roles, live regions) and axe/RTL confirm names and roles, but
  what VoiceOver actually says for the search autocomplete, the cart drawer and the checkout stepper still
  needs a human pass (Cmd+F5, then walk each flow).
- Real 200% browser zoom and Windows High Contrast / forced-colors were approximated (640 px viewport) or
  not checked.
- axe finds roughly a third of issues; reading order and meaningful sequence on the pages were reviewed
  from the DOM, not with assistive technology.
- Dev-only widgets (TanStack Query devtools toggle, "Crash this widget" switches) are excluded from the
  focus-style check: they do not exist in a production build.
