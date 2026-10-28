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

export const categoryKeys = {
  all: ["categories"] as const,
  tree: () => [...categoryKeys.all, "tree"] as const,
  detail: (slug: string) => [...categoryKeys.all, "detail", slug] as const,
}

export const brandKeys = {
  all: ["brands"] as const,
  list: (categorySlug?: string) =>
    [...brandKeys.all, "list", categorySlug ?? null] as const,
}

/** User-scoped families (cleared when the signed-in user changes: see `SessionCacheSync`). */
export const addressKeys = {
  all: ["addresses"] as const,
  list: () => [...addressKeys.all, "list"] as const,
}

export const wishlistKeys = {
  all: ["wishlist"] as const,
  ids: () => [...wishlistKeys.all, "ids"] as const,
  lists: () => [...wishlistKeys.all, "list"] as const,
  list: (page = 1) => [...wishlistKeys.lists(), { page }] as const,
}

/** `owner` is "guest" or the user id: two owners never share a cache entry. */
export const cartKeys = {
  all: ["cart"] as const,
  current: (owner: string) => [...cartKeys.all, owner] as const,
}

export const orderKeys = {
  all: ["orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (filters: Filters) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
}

export const reviewKeys = {
  all: ["reviews"] as const,
  list: (productId: string) => [...reviewKeys.all, "list", productId] as const,
}

export const questionKeys = {
  all: ["questions"] as const,
  list: (productId: string) =>
    [...questionKeys.all, "list", productId] as const,
}

export const similarKeys = {
  all: ["similar"] as const,
  list: (productId: string) => [...similarKeys.all, productId] as const,
}

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
}

export const profileKeys = {
  all: ["profile"] as const,
  me: () => [...profileKeys.all, "me"] as const,
}

export const pincodeKeys = {
  all: ["pincode"] as const,
  check: (pincode: string) => [...pincodeKeys.all, pincode] as const,
}

export const searchKeys = {
  all: ["search"] as const,
  suggestions: (term: string) =>
    [...searchKeys.all, "suggestions", term] as const,
}

export const healthKeys = { all: ["health"] as const }
