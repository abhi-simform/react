import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes"

// The route tree is the app's skeleton (plan 2.2). Reading rules:
// - layout(file, children): wraps children in the file's <Outlet/>, adds NO url segment.
// - route(path, file, children?): adds a url segment; with children it is also a layout.
// - index(file): the default child of its parent (renders at the parent's exact url).
export default [
  layout("routes/shell.tsx", [
    index("routes/home.tsx"),
    route("products", "routes/products.tsx"),
    route("c/:categorySlug", "routes/category.tsx"),
    route("p/:productSlug", "routes/product-detail.tsx"),
    route("compare", "routes/compare.tsx"),
    route("deals", "routes/deals.tsx"),
    route("cart", "routes/cart.tsx"),
    route("help", "routes/help.tsx"),
    route("policies/:slug", "routes/policy.tsx"),

    route("verify-email", "routes/verify-email.tsx"),
    route("reset-password", "routes/reset-password.tsx"),
    route("auth/google/callback", "routes/google-callback.tsx"),
    route("offline", "routes/offline.tsx"),

    // PublicOnly: signed-in users are bounced away from these.
    layout("routes/guards/public-only.tsx", [
      route("login", "routes/login.tsx"),
      route("register", "routes/register.tsx"),
      route("forgot-password", "routes/forgot-password.tsx"),
    ]),

    // RequireAuth: anonymous users are sent to /login (remembering where they were going).
    layout("routes/guards/require-auth.tsx", [
      route("wishlist", "routes/wishlist.tsx"),
      route("orders", "routes/orders.tsx"),
      route("orders/:orderId", "routes/order-detail.tsx"),
      route("checkout", "routes/checkout/layout.tsx", [
        index("routes/checkout/index.tsx"),
        route("address", "routes/checkout/address.tsx"),
        route("delivery", "routes/checkout/delivery.tsx"),
        route("payment", "routes/checkout/payment.tsx"),
        route("review", "routes/checkout/review.tsx"),
      ]),
      route("checkout/success/:orderId", "routes/checkout/success.tsx"),
      route("account", "routes/account/layout.tsx", [
        index("routes/account/index.tsx"),
        route("profile", "routes/account/profile.tsx"),
        route("addresses", "routes/account/addresses.tsx"),
        route("security", "routes/account/security.tsx"),
        route("notifications", "routes/account/notifications.tsx"),
        route("payments", "routes/account/payments.tsx"),
      ]),
    ]),

    // RequireRole: needs a session AND the seller role (403 page otherwise).
    layout("routes/guards/require-seller.tsx", [
      route("seller", "routes/seller.tsx"),
    ]),

    // Earlier-stage labs, grouped under /dev (kept; see 5.10 in the notes).
    route("dev", "routes/dev/layout.tsx", [
      index("routes/dev/index.tsx"),
      route("explorer", "routes/dev/explorer.tsx"),
      route("effects", "routes/dev/effects.tsx"),
      route("rules", "routes/dev/rules.tsx"),
      route("refs", "routes/dev/refs.tsx"),
      route("countdown", "routes/dev/countdown.tsx"),
      route("memo", "routes/dev/memo.tsx"),
      route("closures", "routes/dev/closures.tsx"),
      route("bugs", "routes/dev/bugs.tsx"),
      route("keys", "routes/dev/keys.tsx"),
    ]),

    route("*", "routes/not-found.tsx"),
  ]),
] satisfies RouteConfig
