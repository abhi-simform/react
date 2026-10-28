export const NETWORK_MESSAGE =
  "Cannot reach the server. Check your connection and try again."
export const TIMEOUT_MESSAGE = "The server took too long to answer. Try again."

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(init: {
    status: number
    code: string
    message: string
    details?: unknown
  }) {
    super(init.message)
    this.name = "ApiError"
    this.status = init.status
    this.code = init.code
    this.details = init.details
  }

  /** The request never got an answer (server down, offline, DNS, CORS failure). */
  get isNetwork(): boolean {
    return this.code === "NETWORK_ERROR"
  }
  /** Our own 10 second deadline fired. Retrying may help. */
  get isTimeout(): boolean {
    return this.code === "TIMEOUT"
  }
  /** 422: `fieldErrors` says which input to blame (form mapping, Stage 7). */
  get isValidation(): boolean {
    return this.status === 422
  }
  /**
   * Backend 422 `details` is `[{ in, path, message }]`; this flattens it to
   * `{ "pincode": "We do not deliver..." }` (first message per path wins).
   */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {}
    if (!Array.isArray(this.details)) return out
    for (const item of this.details as unknown[]) {
      if (
        typeof item === "object" &&
        item !== null &&
        "path" in item &&
        typeof item.path === "string" &&
        "message" in item &&
        typeof item.message === "string"
      ) {
        out[item.path] ??= item.message
      }
    }
    return out
  }
}

/**
 * The server answered 2xx but the data does not match our schema: an API
 * contract change, not a user error. Carries the Zod issues for debugging.
 */
export class ContractError extends Error {
  readonly path: string
  readonly issues: readonly { path: PropertyKey[]; message: string }[]

  constructor(
    request: string,
    issues: readonly { path: readonly PropertyKey[]; message: string }[]
  ) {
    const first = issues[0]
    const where = first
      ? first.path.map(String).join(".") || "(root)"
      : "(root)"
    super(
      `API contract mismatch for ${request} at ${where}: ${first?.message ?? "invalid"}`
    )
    this.name = "ContractError"
    this.path = where
    this.issues = issues.map((i) => ({ path: [...i.path], message: i.message }))
  }
}

/**
 * Anything thrown by `request` becomes an ApiError so UI state has one error
 * type: network failures (`fetch` rejects with a TypeError, no status) and
 * contract mismatches get their own codes.
 */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  if (err instanceof ContractError) {
    return new ApiError({
      status: 200,
      code: "CONTRACT_ERROR",
      message: err.message,
    })
  }
  return new ApiError({
    status: 0,
    code: "NETWORK_ERROR",
    message: NETWORK_MESSAGE,
  })
}
