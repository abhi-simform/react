import { useFormContext } from "react-hook-form"
import { Link, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth"
import { useQuery } from "@tanstack/react-query"
import { addressQueries } from "@/features/account"
import { paths } from "@/lib/paths"

import { clearDraft } from "../draft"
import { describeSlot } from "../slots"
import type { CheckoutInput } from "../schemas"

/** Step 4: summary. Placing a real order is Stage 11, so the real button is disabled. */
export function ReviewStep() {
  const { getValues } = useFormContext<CheckoutInput>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const values = getValues()
  const addresses = useQuery(addressQueries.list())
  const address = addresses.data?.find((a) => a.id === values.addressId)

  function simulatePlaced() {
    // What a real "order placed" does: the draft is finished business. The success page is
    // outside the checkout layout, so the form unmounts (no `reset()`: it would re-save a
    // blank draft and make the step guard bounce us to step 1 before we leave).
    if (user) clearDraft(user.id)
    void navigate(paths.orderSuccess(`fake-${Date.now()}`), { replace: true })
  }

  const row = (label: string, value: string, step: string) => (
    <div className="flex items-baseline justify-between gap-4 border-b py-1 text-sm">
      <dt className="font-medium">{label}</dt>
      <dd className="flex-1">{value}</dd>
      <Link to={`/checkout/${step}`} className="underline">
        Change
      </Link>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-medium">Review order</h1>
      <dl>
        {row(
          "Deliver to",
          address
            ? `${address.fullName}, ${address.line1}, ${address.city} ${address.pincode}`
            : "Loading address...",
          "address"
        )}
        {row(
          "Delivery",
          `${values.method === "express" ? "Express" : "Standard"}, ${describeSlot(values.slot)}`,
          "delivery"
        )}
        {row(
          "Payment",
          values.payment === "cod" ? "Cash on delivery" : "Razorpay (online)",
          "payment"
        )}
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled>
          Place order (arrives in Stage 11)
        </Button>
        {import.meta.env.DEV && (
          <Button type="button" variant="outline" onClick={simulatePlaced}>
            Dev: simulate placing (clears the draft)
          </Button>
        )}
      </div>
    </div>
  )
}
