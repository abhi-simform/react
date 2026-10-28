/** Where to go after login: the `from` we stored in navigation state, if it is a safe in-app path. */
export function getReturnTo(state: unknown, fallback = "/"): string {
  if (typeof state !== "object" || state === null || !("from" in state))
    return fallback
  const from = state.from
  if (typeof from !== "string") return fallback
  // Only same-origin paths ("/x"): "//evil.com" and "https://..." would be an open redirect.
  if (!from.startsWith("/") || from.startsWith("//")) return fallback
  if (from === "/login" || from.startsWith("/login?")) return fallback
  return from
}
