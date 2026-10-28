import { useFormContext } from "react-hook-form"
import { useLocation, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { paths } from "@/lib/paths"

import type { CheckoutInput } from "../schemas"
import { STEP_FIELDS } from "../schemas"
import { useStepperDispatch } from "../stepperContext"
import { CHECKOUT_STEPS, stepIndexFromPath } from "../steps"

/**
 * Back / Continue. Continue validates ONLY this step's fields (`trigger(fields)`) and, when
 * invalid, focuses the first invalid one (`shouldFocus`). Navigation PUSHES history entries
 * (7.7): each step is a URL, so the browser's Back and Forward move between steps. (5.5 used
 * `replace` for a single history entry; this stage deliberately changes that.)
 */
export function StepNav() {
  const navigate = useNavigate()
  const { trigger } = useFormContext<CheckoutInput>()
  const dispatch = useStepperDispatch()
  const index = stepIndexFromPath(useLocation().pathname)
  const previous = CHECKOUT_STEPS[index - 1]
  const next = CHECKOUT_STEPS[index + 1]
  const current = CHECKOUT_STEPS[index]

  async function goNext() {
    if (!current || !next) return
    const valid = await trigger([...STEP_FIELDS[current.slug]], {
      shouldFocus: true,
    })
    if (valid) {
      dispatch({ type: "complete", step: index })
      void navigate(paths.checkoutStep(next.slug))
    }
  }

  return (
    <div className="mt-4 flex gap-3">
      {previous && (
        <Button
          type="button"
          variant="outline"
          onClick={() => void navigate(paths.checkoutStep(previous.slug))}
        >
          Back
        </Button>
      )}
      {next && (
        <Button type="button" onClick={() => void goNext()}>
          Continue to {next.label.toLowerCase()}
        </Button>
      )}
    </div>
  )
}
