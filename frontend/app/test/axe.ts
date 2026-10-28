import { configureAxe } from "vitest-axe"
import * as matchers from "vitest-axe/matchers"
import { expect } from "vitest"

expect.extend(matchers)

/**
 * axe for component tests (12.9). jsdom has no layout or colours, so `color-contrast` and the
 * rules that need real geometry (`target-size`) are switched off here: Playwright runs them in a
 * real browser (e2e/a11y.spec.ts). What this catches: names, roles, labels, ARIA validity, list and
 * heading structure.
 */
export const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
    "target-size": { enabled: false },
    region: { enabled: false },
  },
})
