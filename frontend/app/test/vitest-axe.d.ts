// vitest-axe 0.1 augments the old `Vi` namespace; Vitest 5 reads `Assertion` from "vitest".
import "vitest"

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> {
    toHaveNoViolations(): void
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void
  }
}
