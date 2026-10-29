import {
  addBreadcrumb,
  browserTracingIntegration,
  captureException,
  init,
  metrics,
  setUser,
} from "@sentry/react"

import { env } from "@/lib/env"
import { scrubBreadcrumb, scrubEvent } from "@/lib/scrub"

/**
 * The ONLY file that imports the Sentry SDK (14.6). `lib/observability.ts` loads it with a dynamic `import()`, and
 * only when `VITE_SENTRY_DSN` was set at build time, so a build without a DSN contains none of it.
 */

/** Noise that is not an application bug. */
const IGNORED = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
  "AbortError",
  "The operation was aborted",
]

export function start(): void {
  init({
    dsn: env.SENTRY_DSN,
    release: env.RELEASE || undefined,
    environment: env.ENVIRONMENT,
    // Never attach user info (IP, e-mail), cookies, headers, bodies or query strings on our behalf: the only
    // identity is `setUser({ id })` (and `scrubEvent` removes anything else again).
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    ignoreErrors: IGNORED,
    // Our own `installGlobalErrorReporting` + boundaries are the single funnel (`reportError`), so the SDK's
    // window.onerror / unhandledrejection integration is removed: otherwise every error would be sent twice.
    integrations: (defaults) => [
      ...defaults.filter((i) => i.name !== "GlobalHandlers"),
      ...(env.TRACES_SAMPLE_RATE > 0 ? [browserTracingIntegration()] : []),
    ],
    tracesSampleRate: env.TRACES_SAMPLE_RATE,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
    // Do not trace requests to third parties; the API is propagated by URL only when tracing is on.
    tracePropagationTargets: [env.VITE_API_URL],
  })
}

export const send = {
  exception(
    error: unknown,
    tags: Record<string, string>,
    extra?: Record<string, unknown>
  ) {
    captureException(error, { tags, extra })
  },
  user(id: string | null) {
    setUser(id ? { id } : null)
  },
  vital(name: string, value: number, rating: string, path: string) {
    addBreadcrumb({
      category: "web-vital",
      level: rating === "poor" ? "warning" : "info",
      message: `${name} ${value}`,
      data: { rating, path },
    })
    metrics.distribution(`web_vital.${name.toLowerCase()}`, value, {
      unit: name === "CLS" ? "none" : "millisecond",
      attributes: { rating, path },
    })
  },
}
