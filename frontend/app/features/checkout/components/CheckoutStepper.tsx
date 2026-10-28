import { useFormContext } from "react-hook-form"
import { Link, useLocation } from "react-router"

import { paths } from "@/lib/paths"

import type { CheckoutInput } from "../schemas"
import {
  CHECKOUT_STEPS,
  firstIncompleteStep,
  stepIndexFromPath,
} from "../steps"

/**
 * Progress list. The current step is DERIVED from the url (no state to keep in sync) and
 * announced with `aria-current="step"`. Steps up to the first incomplete one are links.
 */
export function CheckoutStepper() {
  const { pathname } = useLocation()
  const { getValues } = useFormContext<CheckoutInput>()
  const current = stepIndexFromPath(pathname)
  const reachable = firstIncompleteStep(getValues())

  return (
    <ol
      aria-label="Checkout progress"
      className="mb-4 flex flex-wrap gap-4 text-sm"
    >
      {CHECKOUT_STEPS.map((step, i) => {
        const label = `${i + 1}. ${step.label}`
        return (
          <li
            key={step.slug}
            aria-current={i === current ? "step" : undefined}
            className={
              i === current
                ? "font-medium underline"
                : i <= reachable
                  ? ""
                  : "text-neutral-500"
            }
          >
            {i !== current && i <= reachable ? (
              <Link to={paths.checkoutStep(step.slug)} className="underline">
                {label}
              </Link>
            ) : (
              label
            )}
          </li>
        )
      })}
    </ol>
  )
}
