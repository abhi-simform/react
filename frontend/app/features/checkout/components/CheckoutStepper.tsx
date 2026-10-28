import { useLocation } from "react-router"

import { CHECKOUT_STEPS, stepIndexFromPath } from "../steps"

/**
 * Progress list. The current step is DERIVED from the url: no state to keep in sync with it.
 */
export function CheckoutStepper() {
  const { pathname } = useLocation()
  const current = stepIndexFromPath(pathname)

  return (
    <ol
      aria-label="Checkout progress"
      className="mb-4 flex flex-wrap gap-4 text-sm"
    >
      {CHECKOUT_STEPS.map((step, i) => (
        <li
          key={step.slug}
          aria-current={i === current ? "step" : undefined}
          className={
            i === current
              ? "font-medium underline"
              : i < current
                ? ""
                : "text-neutral-500"
          }
        >
          {i + 1}. {step.label}
        </li>
      ))}
    </ol>
  )
}
