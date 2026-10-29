// Copied from /frontend/app/lib/api/errors.ts (admin shares no code with the storefront).
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

  /**
   * 422 / 409 `details` is `[{ in, path, message }]`; flattened to `{ "variants.0.sku": "..." }`
   * (first message per path wins). The dotted path is exactly react-hook-form's field name.
   */
  get fieldErrors(): Partial<Record<string, string>> {
    const out: Partial<Record<string, string>> = {}
    if (!Array.isArray(this.details)) return out
    for (const item of this.details as unknown[]) {
      if (typeof item !== "object" || item === null) continue
      const { path, message } = item as { path?: unknown; message?: unknown }
      if (typeof path === "string" && typeof message === "string")
        out[path] ??= message
    }
    return out
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError
