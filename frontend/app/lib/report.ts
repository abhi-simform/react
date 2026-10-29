import { captureError } from "@/lib/observability"

/**
 * The single place errors are reported. The console always (what the developer and a support screenshot see),
 * and, when the build has a Sentry DSN (14.6), an event with the context as a tag, the API request id for failed
 * calls, and the component stack for boundaries. Components never import Sentry: they call this.
 */
export function reportError(
  error: unknown,
  context?: string,
  extra?: Record<string, unknown>
): void {
  console.error(context ? `[${context}]` : "[error]", error)
  captureError(error, context, extra)
}
