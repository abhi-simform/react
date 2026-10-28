/**
 * Query key factories (9.2). The key is the cache identity AND the dependency array: when it
 * changes, Query fetches for the new key. Keys are hierarchical so a prefix invalidates a
 * whole family: `["products"]` = every product query, `["products", "list"]` = lists only.
 * Filter objects are hashed deterministically (property order does not matter), but they must
 * be plain JSON (no functions, Dates or class instances) or two equal filters would not match.
 * `lib/` may not import from `features/`, so filters are typed structurally.
 */
type Filters = Record<string, unknown>

export const configKeys = {
  all: ["config"] as const,
  public: ["config", "public"] as const,
}

export const authKeys = {
  all: ["auth"] as const,
  me: ["auth", "me"] as const,
  sessions: ["auth", "sessions"] as const,
}

export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (filters: Filters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (slug: string) => [...productKeys.details(), slug] as const,
  /** Infinite ("load more") lists: the filters WITHOUT `page`, a different cache shape from `list`. */
  infinites: () => [...productKeys.all, "infinite"] as const,
  infinite: (filters: Filters) =>
    [...productKeys.infinites(), filters] as const,
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
  /** Nested UNDER the owner's cart key: invalidating the cart also refreshes which coupons apply. */
  coupons: (owner: string) => [...cartKeys.current(owner), "coupons"] as const,
}

export const dealKeys = {
  all: ["deals"] as const,
  lists: () => [...dealKeys.all, "list"] as const,
  list: (filters: Filters) => [...dealKeys.lists(), filters] as const,
}

/** The server clock offset (`serverTime - clientTime`), measured from `GET /time`. */
export const timeKeys = { offset: ["time", "offset"] as const }

export const orderKeys = {
  all: ["orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (filters: Filters) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
}

export const paymentKeys = {
  all: ["payments"] as const,
  lists: () => [...paymentKeys.all, "list"] as const,
  list: (filters: Filters) => [...paymentKeys.lists(), filters] as const,
}

export const reviewKeys = {
  all: ["reviews"] as const,
  /** Everything about one product's reviews: lists (all filters), summary, my eligibility. */
  forProduct: (productId: string) => [...reviewKeys.all, productId] as const,
  lists: (productId: string) =>
    [...reviewKeys.forProduct(productId), "list"] as const,
  list: (productId: string, filter: Filters = {}) =>
    [...reviewKeys.lists(productId), filter] as const,
  summary: (productId: string) =>
    [...reviewKeys.forProduct(productId), "summary"] as const,
  eligibility: (productId: string) =>
    [...reviewKeys.forProduct(productId), "eligibility"] as const,
}

export const questionKeys = {
  all: ["questions"] as const,
  forProduct: (productId: string) => [...questionKeys.all, productId] as const,
  list: (productId: string, filter: Filters = {}) =>
    [...questionKeys.forProduct(productId), "list", filter] as const,
  answers: (questionId: string) =>
    [...questionKeys.all, "answers", questionId] as const,
}

export const relatedKeys = {
  all: ["related"] as const,
  list: (categorySlug: string, excludeSlug: string) =>
    [...relatedKeys.all, categorySlug, excludeSlug] as const,
}

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (filter: Filters = {}) =>
    [...notificationKeys.all, "list", filter] as const,
  /** The 10 newest, for the bell dropdown (not the full page). */
  latest: () => [...notificationKeys.all, "latest"] as const,
  unread: () => [...notificationKeys.all, "unread-count"] as const,
  prefs: () => [...notificationKeys.all, "prefs"] as const,
}

/**
 * Rails (B8). `owner` is "guest" or the user id: "for you" and "recently viewed" differ per
 * person, so two owners never share an entry; `similar`/`alsoBought`/`trending` are the same for
 * everyone.
 */
export const railKeys = {
  all: ["rails"] as const,
  similar: (productId: string) =>
    [...railKeys.all, "similar", productId] as const,
  alsoBought: (productId: string) =>
    [...railKeys.all, "also-bought", productId] as const,
  trending: (category?: string) =>
    [...railKeys.all, "trending", category ?? null] as const,
  forYou: (owner: string, seed: readonly string[]) =>
    [...railKeys.all, "for-you", owner, seed] as const,
  recentlyViewed: (owner: string, ids: readonly string[] = []) =>
    [...railKeys.all, "recently-viewed", owner, ids] as const,
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

export const homeKeys = {
  all: ["home"] as const,
  banners: (placement: string) =>
    [...homeKeys.all, "banners", placement] as const,
}

export const offerKeys = { all: ["offers"] as const }

export const healthKeys = { all: ["health"] as const }
