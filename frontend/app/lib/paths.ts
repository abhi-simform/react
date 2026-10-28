import { generatePath } from "react-router"

/**
 * Every URL the app links to is built here (no string templates in components).
 * `generatePath` fills `:params` and URL-encodes them, so a slug with a space or
 * a slash cannot break out of its path segment. The route patterns below must
 * match `routes.ts`; renaming a segment there means one edit here.
 */
type Query = Record<string, string | readonly string[] | undefined>

function withQuery(path: string, query?: Query): string {
  if (!query) return path
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") continue
    for (const v of typeof value === "string" ? [value] : value) {
      search.append(key, v)
    }
  }
  const qs = search.toString()
  return qs ? `${path}?${qs}` : path
}

export const paths = {
  home: () => "/",
  products: (query?: Query) => withQuery("/products", query),
  category: (slug: string, query?: Query) =>
    withQuery(generatePath("/c/:categorySlug", { categorySlug: slug }), query),
  product: (slug: string) =>
    generatePath("/p/:productSlug", { productSlug: slug }),
  compare: () => "/compare",
  deals: () => "/deals",
  cart: () => "/cart",
  wishlist: () => "/wishlist",
  help: () => "/help",
  policy: (slug: string) => generatePath("/policies/:slug", { slug }),

  login: () => "/login",
  register: () => "/register",
  forgotPassword: () => "/forgot-password",

  orders: () => "/orders",
  order: (id: string) => generatePath("/orders/:orderId", { orderId: id }),
  checkout: () => "/checkout",
  checkoutStep: (step: "address" | "delivery" | "payment" | "review") =>
    `/checkout/${step}`,
  orderSuccess: (id: string) =>
    generatePath("/checkout/success/:orderId", { orderId: id }),

  account: () => "/account",
  accountPage: (
    page: "profile" | "addresses" | "security" | "notifications" | "payments"
  ) => `/account/${page}`,
  seller: () => "/seller",
  dev: (lab?: string) => (lab ? `/dev/${lab}` : "/dev"),
} as const
