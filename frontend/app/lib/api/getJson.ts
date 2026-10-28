import { ApiError, NETWORK_MESSAGE, TIMEOUT_MESSAGE } from "./errors"
import { isApiError } from "./envelope"

export const DEFAULT_TIMEOUT_MS = 10_000

type Init = RequestInit & { timeoutMs?: number }

/**
 * The ONLY place in the app that calls `fetch` (6.2). It turns every way a
 * request can go wrong into one of two outcomes:
 * - an `ApiError` (network, timeout, HTTP error with or without our envelope), or
 * - the caller's own `AbortError`, re-thrown untouched so UIs can ignore it.
 * fetch() only rejects on network failure; a 404 or 500 still RESOLVES, so we
 * check `response.ok`. The success body is `unknown` on purpose: callers must
 * narrow or validate it. `response.json()` is typed `Promise<any>`, which would
 * silently switch checking off.
 */
export async function getJson(
  url: string,
  { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...init }: Init = {}
): Promise<{ status: number; body: unknown }> {
  // The caller's signal AND our deadline: whichever fires first aborts the fetch.
  const deadline = AbortSignal.timeout(timeoutMs)
  const combined = signal ? AbortSignal.any([signal, deadline]) : deadline

  let response: Response
  let body: unknown
  try {
    response = await fetch(url, { ...init, signal: combined })
    // Not JSON (an HTML 502 from a proxy, a 204): `undefined`, decided below.
    body = await response.json().catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") throw err
      return undefined
    })
  } catch (err) {
    if (signal?.aborted) throw err // the caller gave up: not an error to report
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new ApiError({
        status: 0,
        code: "TIMEOUT",
        message: TIMEOUT_MESSAGE,
      })
    }
    // fetch rejects with a TypeError for DNS/refused/offline/CORS.
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: NETWORK_MESSAGE,
    })
  }

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
      message: `HTTP ${response.status}: ${response.statusText || "Server error"}`,
    })
  }
  return { status: response.status, body }
}
