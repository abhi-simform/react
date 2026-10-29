import { getUser } from "@/lib/auth/session"

// Every key starts with the signed-in user id: a cache entry can never be served to another
// account (and sign-out clears the whole cache as a second line of defence).
const scope = () => getUser()?.id ?? "anon"

export const qk = {
  products: {
    all: () => [scope(), "products"] as const,
    list: (params: object) => [scope(), "products", "list", params] as const,
    detail: (id: string) => [scope(), "products", "detail", id] as const,
  },
  categories: {
    all: () => [scope(), "categories"] as const,
    admin: () => [scope(), "categories", "admin"] as const,
    public: () => [scope(), "categories", "public"] as const,
  },
  brands: {
    admin: (search?: string) =>
      [scope(), "brands", "admin", search ?? ""] as const,
    all: () => [scope(), "brands"] as const,
  },
  users: {
    all: () => [scope(), "users"] as const,
    list: (params: object) => [scope(), "users", "list", params] as const,
  },
  orders: {
    all: () => [scope(), "orders"] as const,
    list: (params: object) => [scope(), "orders", "list", params] as const,
    detail: (id: string) => [scope(), "orders", "detail", id] as const,
    returns: (params: object) =>
      [scope(), "orders", "returns", params] as const,
  },
  marketing: {
    coupons: () => [scope(), "marketing", "coupons"] as const,
    deals: () => [scope(), "marketing", "deals"] as const,
    banners: () => [scope(), "marketing", "banners"] as const,
  },
  moderation: {
    all: () => [scope(), "moderation"] as const,
    reviews: (params: object) =>
      [scope(), "moderation", "reviews", params] as const,
    questions: (params: object) =>
      [scope(), "moderation", "questions", params] as const,
  },
  analytics: {
    all: () => [scope(), "analytics"] as const,
    one: (name: string, params: object) =>
      [scope(), "analytics", name, params] as const,
  },
  sellers: {
    applications: (params: object) =>
      [scope(), "sellers", "applications", params] as const,
    detail: (id: string) => [scope(), "sellers", "detail", id] as const,
    all: () => [scope(), "sellers"] as const,
  },
  audit: {
    list: (params: object) => [scope(), "audit", "list", params] as const,
  },
  system: {
    health: () => [scope(), "system", "health"] as const,
    settings: () => [scope(), "system", "settings"] as const,
  },
}
