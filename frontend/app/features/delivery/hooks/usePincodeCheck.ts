import { useDebounce } from "@/hooks/useDebounce"
import { useFetch } from "@/hooks/useFetch"
import type { ApiError } from "@/lib/api/errors"
import { PINCODE_RE } from "@/lib/fields"

import { checkPincode } from "../api"
import type { Serviceable } from "../schemas"

export type PincodeCheckState =
  | { status: "empty" }
  /** Instant and local: not 6 digits (or starts with 0). No request was made. */
  | { status: "format"; message: string }
  /** 6 valid digits; waiting for the debounce or for the response. */
  | { status: "checking" }
  | { status: "serviceable"; result: Serviceable }
  | { status: "unserviceable" }
  | { status: "error"; error: ApiError; retry: () => void }

const DEBOUNCE_MS = 400

/**
 * Async validation of a pincode (7.6), in layers:
 * 1. FORMAT is checked locally on every keystroke: instant, no request (`PINCODE_RE`).
 * 2. Only a valid-looking value is debounced (400 ms of silence) and sent.
 * 3. `useFetch` aborts the previous request when the value changes and ignores a settled
 *    result that belongs to another key, so a slow answer for an OLD pincode can never
 *    overwrite the newer one (the `result.pincode === value` check below is a second belt).
 * The answer is ADVICE for the UI. The server decides again when the address is saved.
 */
export function usePincodeCheck(raw: string): PincodeCheckState {
  const value = raw.trim()
  const formatOk = PINCODE_RE.test(value)
  const settled = useDebounce(value, DEBOUNCE_MS)
  const request = useFetch(
    (signal) => checkPincode(settled, signal),
    [settled],
    { enabled: PINCODE_RE.test(settled) }
  )

  if (value === "") return { status: "empty" }
  if (!formatOk)
    return {
      status: "format",
      message: "Enter a valid 6-digit pincode",
    }
  // Debounce still pending: `settled` lags behind what is typed.
  if (settled !== value) return { status: "checking" }
  switch (request.status) {
    case "success": {
      const data = request.data
      if (data.pincode !== value) return { status: "checking" } // an old answer: never show it
      return data.serviceable
        ? { status: "serviceable", result: data }
        : { status: "unserviceable" }
    }
    case "error":
      return { status: "error", error: request.error, retry: request.reload }
    default:
      return { status: "checking" }
  }
}
