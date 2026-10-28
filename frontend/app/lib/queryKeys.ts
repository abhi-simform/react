/**
 * Query key factories (9.2). The key is the cache identity AND the dependency array: when it
 * changes, Query fetches for the new key. Keys are hierarchical so a prefix invalidates a
 * whole family: `["products"]` = every product query, `["products", "list"]` = lists only.
 * Filter objects are hashed deterministically (property order does not matter), but they must
 * be plain JSON (no functions, Dates or class instances) or two equal filters would not match.
 * `lib/` may not import from `features/`, so filters are typed structurally.
 */
type Filters = Record<string, unknown>

export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (filters: Filters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (slug: string) => [...productKeys.details(), slug] as const,
}
