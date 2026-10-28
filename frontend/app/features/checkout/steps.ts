import { STEP_SCHEMAS, type StepSlug } from "./schemas"

export const CHECKOUT_STEPS = [
  { slug: "address", label: "Address" },
  { slug: "delivery", label: "Delivery" },
  { slug: "payment", label: "Payment" },
  { slug: "review", label: "Review" },
] as const satisfies readonly { slug: StepSlug; label: string }[]

export type CheckoutStep = (typeof CHECKOUT_STEPS)[number]

/** Which step a pathname is on: pure, so it is trivial to test. -1 when none (e.g. the success page). */
export function stepIndexFromPath(pathname: string): number {
  return CHECKOUT_STEPS.findIndex((s) => pathname.endsWith(`/${s.slug}`))
}

/**
 * Index of the first step whose own schema does not pass yet: where a deep link to a later
 * step is sent. `review` is never "first incomplete" by itself (it only needs the others).
 */
export function firstIncompleteStep(values: unknown): number {
  const i = CHECKOUT_STEPS.slice(0, -1).findIndex(
    (s) => !STEP_SCHEMAS[s.slug].safeParse(values).success
  )
  return i === -1 ? CHECKOUT_STEPS.length - 1 : i
}
