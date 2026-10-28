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
