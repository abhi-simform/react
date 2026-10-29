import { ApiError } from "@/lib/api/errors"
import { getJson } from "@/lib/api/getJson"
import { isApiSuccess } from "@/lib/api/envelope"
import type { z } from "zod"

/**
 * 14.8 (SSR experiment): the API as seen from the Node server. `.server.ts` = React Router drops this file from the
 * browser bundle (importing it from client code is a build error), so nothing here can leak to a visitor.
 *
 * - The base URL may differ from the browser's: inside Docker/Render the server reaches the API over the private
 *   network (`API_INTERNAL_URL=http://backend:4000/api/v1`), while the browser needs the public `VITE_API_URL`.
 * - It reuses `getJson` (still the only `fetch` in the app: timeouts, ApiError mapping) and validates EVERY response
 *   with the same Zod schema: on the server a contract change should fail loudly in the log, not render `undefined`.
 * - No cookies are forwarded: the refresh cookie belongs to the API origin, so the server never has it (14.8 notes).
 */
const base = () =>
  (process.env.API_INTERNAL_URL ?? import.meta.env.VITE_API_URL).replace(
    /\/$/,
    ""
  )

export async function serverGet<S extends z.ZodType>(
  path: string,
  schema: S,
  init: { headers?: Record<string, string>; signal?: AbortSignal } = {}
): Promise<z.output<S>> {
  const { body } = await getJson(`${base()}${path}`, {
    headers: { Accept: "application/json", ...init.headers },
    signal: init.signal,
    timeoutMs: 4000, // a server render must not wait 10 s for a slow API
  })
  if (!isApiSuccess(body))
    throw new ApiError({
      status: 200,
      code: "BAD_ENVELOPE",
      message: "Not a success envelope",
    })
  return schema.parse(body.data)
}

export { base as serverApiBase }

/**
 * A POST whose RESPONSE HEADERS matter (login: the API's `Set-Cookie`), so it cannot go through `getJson`
 * (which returns status + body only). The one other `fetch` in the app, allowed because it lives in a server-only
 * file. `clientIp` is passed on as `X-Forwarded-For`: the API's rate limiter keys on the caller's IP, and without it
 * every login from every visitor would look like the SSR server's address (one shared bucket, locked out together).
 */
export async function serverPost(
  path: string,
  body: unknown,
  meta: { clientIp?: string; userAgent?: string | null } = {}
): Promise<{ status: number; json: unknown; setCookies: string[] }> {
  const response = await fetch(`${base()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(meta.clientIp ? { "X-Forwarded-For": meta.clientIp } : {}),
      ...(meta.userAgent ? { "User-Agent": meta.userAgent } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })
  return {
    status: response.status,
    json: await response.json().catch(() => undefined),
    setCookies: response.headers.getSetCookie(),
  }
}
