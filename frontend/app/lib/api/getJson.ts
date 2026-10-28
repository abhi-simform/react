import { ApiError } from "./errors"
import { isApiError } from "./envelope"

/**
 * fetch() only rejects on network failure; a 404 or 500 still RESOLVES, so we
 * check `response.ok`. The success body is `unknown` on purpose: callers must
 * narrow or validate it (guards now, Zod in 2.6). `response.json()` is typed
 * `Promise<any>` in lib.dom, which would silently switch checking off.
 */
export async function getJson(
  url: string,
  init?: RequestInit
): Promise<unknown> {
  const response = await fetch(url, init)
  const body: unknown = await response.json().catch(() => undefined)

  if (!response.ok) {
    if (isApiError(body)) {
      throw new ApiError({
        status: response.status,
        code: body.error.code,
        message: `HTTP ${response.status}: ${body.error.message}`,
        details: body.error.details,
      })
    }
    throw new ApiError({
      status: response.status,
      code: "HTTP_ERROR",
      message: `HTTP ${response.status}: ${response.statusText}`,
    })
  }
  return body
}
