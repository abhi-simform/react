import { useFormContext, useWatch } from "react-hook-form"

import { PincodeStatus, usePincodeCheck } from "@/features/delivery"
import { formatCurrency, formatDate } from "@/lib/format"

import {
  EXPRESS_FEE,
  isoDay,
  SLOT_WINDOWS,
  slotDays,
  slotValue,
} from "../slots"
import type { CheckoutInput } from "../schemas"

/** Step 2: standard or express, then a date/time slot from a grid of native radios. */
export function DeliveryStep() {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<CheckoutInput>()
  const pincode = useWatch<CheckoutInput, "pincode">({ name: "pincode" })
  const method = useWatch<CheckoutInput, "method">({ name: "method" })
  const check = usePincodeCheck(pincode ?? "")

  // The grid starts at the earliest delivery day: tomorrow for express, the API's ETA for standard.
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const eta =
    check.status === "serviceable"
      ? new Date(check.result.estimatedDelivery.from)
      : tomorrow
  const days = slotDays(method === "express" ? tomorrow : eta)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-medium">Delivery options</h1>
      <PincodeStatus state={check} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Delivery speed</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            value="standard"
            {...register("method", {
              // A slot picked for one speed may not exist for the other: start over.
              onChange: () => setValue("slot", ""),
            })}
          />
          Standard (free above Rs 499)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            value="express"
            {...register("method", { onChange: () => setValue("slot", "") })}
          />
          Express (+ {formatCurrency(EXPRESS_FEE)}), from tomorrow
        </label>
        {errors.method && (
          <p role="alert" className="text-xs text-red-700">
            {errors.method.message}
          </p>
        )}
      </fieldset>

      <fieldset aria-describedby={errors.slot ? "slot-error" : undefined}>
        <legend className="mb-1 text-sm font-medium">Delivery slot</legend>
        <table className="text-sm">
          <thead>
            <tr>
              <td />
              {SLOT_WINDOWS.map((w) => (
                <th key={w.id} scope="col" className="px-2 font-normal">
                  {w.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={isoDay(day)}>
                <th scope="row" className="pr-2 text-left font-normal">
                  {formatDate(day, { weekday: "short", year: undefined })}
                </th>
                {SLOT_WINDOWS.map((w) => (
                  <td key={w.id} className="px-2 text-center">
                    <input
                      type="radio"
                      className="size-6" // 24 px target (WCAG 2.2)
                      value={slotValue(isoDay(day), w.id)}
                      aria-label={`${formatDate(day, { weekday: "long", year: undefined })}, ${w.label}`}
                      {...register("slot")}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {errors.slot && (
          <p id="slot-error" role="alert" className="text-xs text-red-700">
            {errors.slot.message}
          </p>
        )}
      </fieldset>
    </div>
  )
}
