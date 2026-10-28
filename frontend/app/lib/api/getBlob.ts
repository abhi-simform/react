import { ApiError, NETWORK_MESSAGE, TIMEOUT_MESSAGE } from "./errors"
import { isApiError } from "./envelope"

/**
 * Binary twin of `getJson` (6.2 allows one place to call `fetch`; this lives beside it and
 * shares its error contract): resolves the body as a `Blob` plus the `Content-Disposition`
 * filename (readable cross-origin only because the API lists it in `Access-Control-Expose-Headers`).
 * An error response is still our JSON envelope, so failures become the same `ApiError`s.
 */
export async function getBlob(
  url: string,
  {
    timeoutMs = 30_000,
    signal,
    ...init
  }: RequestInit & { timeoutMs?: number } = {}
): Promise<{ blob: Blob; filename: string | null }> {
  const deadline = AbortSignal.timeout(timeoutMs)
  const combined = signal ? AbortSignal.any([signal, deadline]) : deadline
  let response: Response
  try {
    response = await fetch(url, { ...init, signal: combined })
  } catch (err) {
    if (signal?.aborted) throw err
    if (err instanceof DOMException && err.name === "TimeoutError")
      throw new ApiError({
        status: 0,
        code: "TIMEOUT",
        message: TIMEOUT_MESSAGE,
      })
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: NETWORK_MESSAGE,
    })
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined)
    if (isApiError(body))
      throw new ApiError({
        status: response.status,
        code: body.error.code,
        message: `HTTP ${response.status}: ${body.error.message}`,
        details: body.error.details,
      })
    throw new ApiError({
      status: response.status,
      code: "HTTP_ERROR",
      message: `HTTP ${response.status}: ${response.statusText || "Server error"}`,
    })
  }
  const blob = await response.blob()
  return {
    blob,
    filename: parseFilename(response.headers.get("Content-Disposition")),
  }
}

/** `attachment; filename="invoice-SS-1.pdf"` (also `filename*=UTF-8''...`) -> the name, or null. */
export function parseFilename(header: string | null): string | null {
  if (!header) return null
  const star = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim())
    } catch {
      /* fall through to the plain form */
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header)
  return plain?.[1]?.trim() || null
}
