import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { FormProvider, useForm, useFormContext } from "react-hook-form"
import { Navigate, Outlet, useLocation } from "react-router"

import { useAuth } from "@/features/auth"
import { paths } from "@/lib/paths"

import { CheckoutCartProvider, type CheckoutCart } from "../cartContext"
import { DEFAULT_VALUES, loadDraft, saveDraft } from "../draft"
import {
  checkoutSchema,
  STEP_FIELDS,
  type CheckoutInput,
  type CheckoutValues,
} from "../schemas"
import { StepperProvider, useStepperDispatch } from "../stepperContext"
import {
  CHECKOUT_STEPS,
  firstIncompleteStep,
  stepIndexFromPath,
} from "../steps"
import { CheckoutStepper } from "./CheckoutStepper"
import { OrderSummary } from "./OrderSummary"

/**
 * The checkout layout (7.7): ONE form for the whole flow. `FormProvider` makes the form
 * available to every step route rendered through `<Outlet/>`; unmounted fields keep their
 * values (RHF's default `shouldUnregister: false`), which is why Back shows what you typed.
 * The draft is restored from sessionStorage once, and saved on every change.
 */
export function CheckoutShell({ cart }: { cart: CheckoutCart }) {
  const { user } = useAuth()
  const userId = user?.id ?? "anonymous" // RequireAuth guarantees a user; this keeps types honest
  const [draft] = useState(() => loadDraft(userId))
  const form = useForm<CheckoutInput, unknown, CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { ...DEFAULT_VALUES, ...draft },
  })

  // `subscribe` listens to form changes WITHOUT re-rendering this component on every keystroke
  // (and, unlike `watch(callback)`, the React Compiler lint accepts it). It returns its unsubscribe.
  const { subscribe } = form
  useEffect(
    () =>
      subscribe({
        formState: { values: true },
        callback: ({ values }) => saveDraft(userId, values),
      }),
    [subscribe, userId]
  )

  return (
    <CheckoutCartProvider value={cart}>
      <FormProvider {...form}>
        <StepperProvider>
          <StepperSync />
          <div className="mx-auto grid max-w-5xl gap-6 p-4 md:grid-cols-[1fr_18rem]">
            <div>
              <CheckoutStepper />
              <StepGuard>
                <Outlet />
              </StepGuard>
            </div>
            <aside
              aria-label="Order summary"
              className="h-fit rounded border p-3 md:sticky md:top-4"
            >
              <OrderSummary />
            </aside>
          </div>
        </StepperProvider>
      </FormProvider>
    </CheckoutCartProvider>
  )
}

/**
 * Feeds the stepper reducer (8.1) from the two things it cannot see itself: the URL (which
 * step is open) and the form (an edited answer un-completes its step and the later ones).
 * Renders nothing. The URL stays the source of truth for the CURRENT step: this only records
 * history (`visited`), which is why the stepper still reads `aria-current` from the path.
 */
function StepperSync() {
  const dispatch = useStepperDispatch()
  const { pathname } = useLocation()
  const { subscribe } = useFormContext<CheckoutInput>()
  const index = stepIndexFromPath(pathname)

  useEffect(() => {
    if (index >= 0) dispatch({ type: "go", step: index })
  }, [dispatch, index])

  useEffect(
    () =>
      subscribe({
        formState: { values: true },
        callback: ({ name }) => {
          const step = CHECKOUT_STEPS.findIndex((s) =>
            (STEP_FIELDS[s.slug] as readonly string[]).includes(name ?? "")
          )
          if (step >= 0) dispatch({ type: "invalidate", step })
        },
      }),
    [subscribe, dispatch]
  )
  return null
}

/**
 * Deep link to a later step (or a refresh without a draft): send the user to the first step
 * that is not complete yet. Derived on render from the form values: no extra state.
 */
function StepGuard({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { getValues } = useFormContext<CheckoutInput>()
  const current = stepIndexFromPath(pathname)
  const first = firstIncompleteStep(getValues())
  if (current > first) {
    const target = CHECKOUT_STEPS[first]
    return <Navigate to={paths.checkoutStep(target.slug)} replace />
  }
  return children
}
