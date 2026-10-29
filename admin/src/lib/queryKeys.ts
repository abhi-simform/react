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
}
