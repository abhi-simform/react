import { ApiError } from "@/lib/api/errors"
import { env } from "@/lib/env"

import type * as SentryModule from "./sentry"

/**
 * 14.6: error tracking behind ONE seam. Everything in the app talks to `reportError` / `setReportUser` /
 * `recordVital`; this file decides whether anything leaves the browser.
 *
 * - No `VITE_SENTRY_DSN` at build time: `__SENTRY_ENABLED__` is the constant `false`, the `import("./sentry")` below
 *   is dead code, and the bundler removes it: the SDK is not in the build at all (checked in docs/observability.md), and
 *   every function here is a no-op (the console line in `reportError` is the whole behaviour, as before Stage 14).
 * - With a DSN: the SDK is loaded lazily AFTER the page has loaded (it never competes with LCP), and anything
 *   reported before it arrives is queued (max 25) and flushed in order.
 */
type Sdk = typeof SentryModule

let sdk: Sdk | null = null
let starting: Promise<void> | null = null
const queue: Array<(s: Sdk) => void> = []
const MAX_QUEUE = 25

function whenReady(job: (s: Sdk) => void) {
  if (!env.SENTRY_DSN) return
  if (sdk) job(sdk)
  else if (queue.length < MAX_QUEUE) queue.push(job)
}

/** Idempotent. Call once, after load. Never throws: a monitoring failure must not break the shop. */
export function initObservability(): Promise<void> {
  if (!__SENTRY_ENABLED__ || !env.SENTRY_DSN) return Promise.resolve()
  starting ??= import("./sentry")
    .then((mod) => {
      mod.start()
      sdk = mod
      for (const job of queue.splice(0)) job(mod)
    })
    .catch((err: unknown) => {
      // Blocked by an ad blocker, offline, CSP: the shop keeps working, events are dropped.
      console.warn("[observability] could not start error tracking", err)
      queue.length = 0
    })
  return starting
}

/** Tags that make an event findable: where it was caught and, for API failures, which server request it was. */
function tagsFor(error: unknown, context?: string): Record<string, string> {
  const tags: Record<string, string> = {}
  if (context) tags.context = context
  if (error instanceof ApiError) {
    tags.api_status = String(error.status)
    tags.api_code = error.code
    if (error.requestId) tags.request_id = error.requestId
  }
  return tags
}

export function captureError(
  error: unknown,
  context?: string,
  extra?: Record<string, unknown>
): void {
  const tags = tagsFor(error, context)
  whenReady((s) => s.send.exception(error, tags, extra))
}

/** Only the id: no e-mail, no name (also enforced again in `scrubEvent`). `null` on sign-out. */
export function setReportUser(id: string | null): void {
  whenReady((s) => s.send.user(id))
}

export function recordVital(v: {
  name: string
  value: number
  rating: string
  path: string
}): void {
  whenReady((s) => s.send.vital(v.name, v.value, v.rating, v.path))
}

/** Test seam: forget everything (unit tests). */
export function __resetObservabilityForTests() {
  sdk = null
  starting = null
  queue.length = 0
}
