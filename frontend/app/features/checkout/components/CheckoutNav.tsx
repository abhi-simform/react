import { Link, useLocation } from "react-router"

import { paths } from "@/lib/paths"

import { CHECKOUT_STEPS, stepIndexFromPath } from "../steps"

/** Back / Continue links. They `replace` so the whole checkout is ONE history entry (5.5). */
export function CheckoutNav() {
  const current = stepIndexFromPath(useLocation().pathname)
  const previous = CHECKOUT_STEPS[current - 1]
  const next = CHECKOUT_STEPS[current + 1]
  return (
    <div className="mt-4 flex gap-4 text-sm">
      {previous && (
        <Link
          to={paths.checkoutStep(previous.slug)}
          replace
          className="underline"
        >
          Back
        </Link>
      )}
      {next && (
        <Link to={paths.checkoutStep(next.slug)} replace className="underline">
          Continue to {next.label.toLowerCase()}
        </Link>
      )}
    </div>
  )
}
