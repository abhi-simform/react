import { useEffect } from "react"
import { useFormContext, useWatch } from "react-hook-form"

import { PincodeStatus, usePincodeCheck } from "@/features/delivery"

import type { CheckoutInput } from "../schemas"

/** Step 3: Razorpay or cash on delivery (no real payment until Stage 11). COD depends on the pincode. */
export function PaymentStep() {
  const {
    register,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<CheckoutInput>()
  const pincode = useWatch<CheckoutInput, "pincode">({ name: "pincode" })
  const check = usePincodeCheck(pincode ?? "")
  const codBlocked =
    check.status === "serviceable" && !check.result.codAvailable

  // A draft may say "cod" for an address whose pincode does not allow it: drop the choice.
  useEffect(() => {
    if (codBlocked && getValues("payment") === "cod")
      setValue("payment", undefined as never)
  }, [codBlocked, getValues, setValue])

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-medium">Payment</h1>
      <fieldset
        aria-describedby={errors.payment ? "payment-error" : undefined}
        className="flex flex-col gap-2"
      >
        <legend className="mb-1 text-sm font-medium">Payment method</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" value="razorpay" {...register("payment")} />
          Pay online (Razorpay: UPI, cards, netbanking)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            value="cod"
            disabled={codBlocked}
            {...register("payment")}
          />
          Cash on delivery
          {codBlocked && " (not available for your pincode)"}
        </label>
        {errors.payment && (
          <p id="payment-error" role="alert" className="text-xs text-red-700">
            {errors.payment.message}
          </p>
        )}
      </fieldset>
      <PincodeStatus state={check} />
    </div>
  )
}
