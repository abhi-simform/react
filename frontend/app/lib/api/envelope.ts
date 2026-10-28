export type PageMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export type ApiSuccess<T> = { success: true; data: T; meta?: PageMeta }

export type ApiFailure = {
  success: false
  error: { code: string; message: string; details?: unknown }
}
export type ApiErrorEnvelope = ApiFailure

/** Discriminated by `success`: narrowing on it gives either `data` or `error`. */
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export type Paginated<T> = { items: T[]; meta: PageMeta }

/**
 * Hand-written type guard for the failure envelope. `x` is `unknown` because
 * it comes straight from `response.json()`; each `in` / typeof check narrows
 * it one step, with no `as` cast anywhere.
 */
export function isApiError(x: unknown): x is ApiFailure {
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

/** Guard for the success envelope. Checks the envelope only, NOT `data` (see 2.6). */
export function isApiSuccess(x: unknown): x is ApiSuccess<unknown> {
  return (
    typeof x === "object" &&
    x !== null &&
    "success" in x &&
    x.success === true &&
    "data" in x
  )
}
