import { useEffect, useId, useState } from "react"

import { useLocalStorage } from "@/hooks/useLocalStorage"
import { PINCODE_RE } from "@/lib/fields"

import { usePincodeCheck } from "../hooks/usePincodeCheck"
import { PincodeStatus } from "./PincodeStatus"

const KEY = "shopsphere.pincode"
const isString = (v: unknown): v is string => typeof v === "string"

/**
 * PDP "Check delivery" (7.6). Not a form library field: one input, one debounced check.
 * The last valid pincode is remembered in localStorage and re-checked on the next visit.
 */
export function DeliveryCheck() {
  const id = useId()
  const [remembered, remember] = useLocalStorage<string>(KEY, "", isString)
  // Start from the remembered value; after that the input owns its text.
  const [value, setValue] = useState(remembered)
  const state = usePincodeCheck(value)

  // Remembering a pincode syncs an external system (localStorage): an effect, only for valid ones.
  const trimmed = value.trim()
  useEffect(() => {
    if (PINCODE_RE.test(trimmed)) remember(trimmed)
  }, [trimmed, remember])

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={id} className="font-medium">
        Check delivery
      </label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        placeholder="6-digit pincode"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
        aria-invalid={state.status === "format" ? true : undefined}
        aria-describedby={`${id}-status`}
        className="w-40 rounded border p-1"
      />
      <div id={`${id}-status`}>
        {state.status === "format" && (
          <p role="alert" className="text-xs text-destructive">
            {state.message}
          </p>
        )}
        <PincodeStatus state={state} />
      </div>
    </div>
  )
}
