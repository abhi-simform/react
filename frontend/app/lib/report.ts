/**
 * The single place errors are reported. Today: the console. Stage 14 plugs
 * Sentry in HERE, so no component needs to change.
 */
export function reportError(error: unknown, context?: string): void {
  console.error(context ? `[${context}]` : "[error]", error)
}
