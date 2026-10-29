import type { Breadcrumb, ErrorEvent } from "@sentry/react"

/**
 * 14.6: what leaves the browser in an error report. Sentry's `beforeSend` / `beforeBreadcrumb` call these, so a
 * report holds NO e-mail address, token, cookie or query string (a `/reset-password?token=...` URL, a
 * `?search=jane@example.com` API call), and the user is only ever `{ id }`. Pure functions: tested with plain
 * objects, no Sentry needed (only the TYPES are imported).
 */

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const JWT = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g
const BEARER = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi
/** A URL's query string and fragment (`?a=b#c`): values there are user input or one-time tokens. */
const URL_QUERY =
  /(\bhttps?:\/\/[^\s"'<>?#]+|\B\/[A-Za-z0-9_./-]+)\?[^\s"'<>#]*(#[^\s"'<>]*)?/g
/** Keys whose VALUE is never sent, wherever they appear in an object. */
const SECRET_KEY =
  /pass(word)?|secret|token|authorization|cookie|api[-_]?key|e-?mail|phone|otp|card|cvv|signature/i

export function scrubString(text: string): string {
  return text
    .replace(URL_QUERY, (_m, base: string) => `${base}?[query]`)
    .replace(JWT, "[token]")
    .replace(BEARER, "$1 [token]")
    .replace(EMAIL, "[email]")
}

/** `https://shop.example.com/reset-password?token=abc#x` -> `https://shop.example.com/reset-password`. */
export function scrubUrl(url: string): string {
  const cut = url.search(/[?#]/)
  return scrubString(cut === -1 ? url : url.slice(0, cut))
}

/** Recursively scrubs strings and redacts secret-looking keys. Depth-limited: an event is not a graph database. */
export function scrubDeep(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return scrubString(value)
  if (value === null || typeof value !== "object") return value
  if (depth > 6) return "[truncated]"
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [key, v] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) out[key] = "[redacted]"
    else if (/(^|_)url$|^(from|to)$/i.test(key) && typeof v === "string")
      out[key] = scrubUrl(v)
    else out[key] = scrubDeep(v, depth + 1)
  }
  return out
}

export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb {
  return {
    ...crumb,
    message: crumb.message ? scrubString(crumb.message) : crumb.message,
    data: crumb.data
      ? (scrubDeep(crumb.data) as Record<string, unknown>)
      : crumb.data,
  }
}

/**
 * The `beforeSend` hook. Returns the cleaned event, or null to drop it.
 * Keeps: stack trace, release, environment, tags, breadcrumbs (cleaned), user.id.
 * Drops: user e-mail/name/IP, request cookies/headers/body, query strings, form data.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent | null {
  const cleaned: ErrorEvent = { ...event }
  if (event.message) cleaned.message = scrubString(event.message)
  if (event.exception?.values)
    cleaned.exception = {
      ...event.exception,
      values: event.exception.values.map((v) => ({
        ...v,
        value: v.value ? scrubString(v.value) : v.value,
      })),
    }
  if (event.user?.id !== undefined) cleaned.user = { id: String(event.user.id) }
  else delete cleaned.user
  if (event.request)
    cleaned.request = event.request.url
      ? { url: scrubUrl(event.request.url) }
      : {}
  if (event.breadcrumbs)
    cleaned.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb)
  if (event.extra)
    cleaned.extra = scrubDeep(event.extra) as Record<string, unknown>
  if (event.contexts)
    cleaned.contexts = scrubDeep(event.contexts) as ErrorEvent["contexts"]
  if (event.tags) cleaned.tags = scrubDeep(event.tags) as ErrorEvent["tags"]
  if (event.transaction) cleaned.transaction = scrubUrl(event.transaction)
  return cleaned
}
