/**
 * Where to go after login. An attacker can craft `/login?from=https://evil.com` (or
 * `//evil.com`, which browsers read as "same scheme, host evil.com") and mail it as a "log in
 * to continue" link: after a real login the victim lands on the attacker's look-alike page.
 * So `from` is only ever used when it is a plain in-app path.
 */
export function safeRedirect(path: unknown, fallback = "/"): string {
  if (typeof path !== "string" || path.length > 500) return fallback
  // Must start with a single "/"; no protocol-relative "//", no backslash tricks ("/\evil.com"),
  // no control characters (CR/LF, tabs) that browsers strip before parsing.
  if (!path.startsWith("/") || path.startsWith("//")) return fallback
  if (path.includes("\\") || [...path].some((ch) => ch.charCodeAt(0) < 32))
    return fallback
  // Never bounce back into the auth pages themselves.
  if (
    /^\/(login|register|forgot-password|reset-password|verify-email|auth\/google)(\/|\?|#|$)/.test(
      path
    )
  )
    return fallback
  return path
}

/** `?from=` (survives a reload and a Google round trip) wins over `location.state.from`. */
export function getReturnTo(
  location: { search: string; state?: unknown },
  fallback = "/"
): string {
  const fromQuery = new URLSearchParams(location.search).get("from")
  if (fromQuery !== null) return safeRedirect(fromQuery, fallback)
  const state = location.state
  if (typeof state === "object" && state !== null && "from" in state)
    return safeRedirect(state.from, fallback)
  return fallback
}
