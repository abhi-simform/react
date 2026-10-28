export const CHECKOUT_STEPS = [
  { slug: "address", label: "Address" },
  { slug: "delivery", label: "Delivery" },
  { slug: "payment", label: "Payment" },
  { slug: "review", label: "Review" },
] as const

export type CheckoutStep = (typeof CHECKOUT_STEPS)[number]

/** Which step a pathname is on: pure, so it is trivial to test. -1 when none (e.g. the success page). */
export function stepIndexFromPath(pathname: string): number {
  return CHECKOUT_STEPS.findIndex((s) => pathname.endsWith(`/${s.slug}`))
}
