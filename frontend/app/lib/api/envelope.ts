export type ApiErrorEnvelope = {
  success: false
  error: { code: string; message: string; details?: unknown }
}

/**
 * Hand-written type guard for the failure envelope. `x` is `unknown` because
 * it comes straight from `response.json()`; each `in` / typeof check narrows
 * it one step, with no `as` cast anywhere.
 */
export function isApiError(x: unknown): x is ApiErrorEnvelope {
  if (typeof x !== "object" || x === null) return false
  if (!("success" in x) || x.success !== false) return false
  if (!("error" in x) || typeof x.error !== "object" || x.error === null) {
    return false
  }
  return (
    "code" in x.error &&
    typeof x.error.code === "string" &&
    "message" in x.error &&
    typeof x.error.message === "string"
  )
}
