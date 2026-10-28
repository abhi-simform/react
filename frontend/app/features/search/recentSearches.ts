export const RECENT_SEARCH_KEY = "shopsphere.recentSearches"
export const MAX_RECENT = 8

export const isTermList = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string")

/** Newest first, case-insensitive de-duplicated (keeps the latest spelling), capped at 8. */
export function addRecent(list: readonly string[], term: string): string[] {
  const t = term.trim().replace(/\s+/g, " ")
  if (!t) return [...list]
  return [t, ...list.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(
    0,
    MAX_RECENT
  )
}
