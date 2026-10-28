import type { ComponentType } from "react"
import { useParams, type RouteObject } from "react-router"

import * as account from "@/routes/account/layout"
import * as accountIndex from "@/routes/account/index"
import * as cart from "@/routes/cart"
import * as checkoutAddress from "@/routes/checkout/address"
import * as checkoutDelivery from "@/routes/checkout/delivery"
import * as checkoutIndex from "@/routes/checkout/index"
import * as checkoutLayout from "@/routes/checkout/layout"
import * as checkoutPayment from "@/routes/checkout/payment"
import * as checkoutReview from "@/routes/checkout/review"
import * as checkoutSuccess from "@/routes/checkout/success"
import * as home from "@/routes/home"
import * as login from "@/routes/login"
import * as notFound from "@/routes/not-found"
import * as orderDetail from "@/routes/order-detail"
import * as orders from "@/routes/orders"
import * as productDetail from "@/routes/product-detail"
import * as products from "@/routes/products"
import * as publicOnly from "@/routes/guards/public-only"
import * as requireAuth from "@/routes/guards/require-auth"
import * as shell from "@/routes/shell"

type RouteModule = {
  default: ComponentType<never>
  handle?: unknown
  ErrorBoundary?: ComponentType<never>
}

/**
 * The REAL route modules wired like `routes.ts` (12.5): the same shell, guards, pages and
 * handles. Only the file-based config is replaced by this list, because `routes.ts` is read by
 * the framework's Vite plugin, not importable at runtime.
 */
/** The framework passes `params` as a prop to a route component; a data router does not. */
const withParams = (Page: ComponentType<never>) =>
  function RouteWithParams() {
    const params = useParams()
    const Any = Page as ComponentType<{ params: typeof params }>
    return <Any params={params} />
  }

const r = (
  path: string | undefined,
  mod: RouteModule,
  children?: RouteObject[]
): RouteObject =>
  ({
    path,
    index: path === undefined && !children ? true : undefined,
    Component: withParams(mod.default),
    handle: mod.handle,
    ErrorBoundary: mod.ErrorBoundary,
    children,
  }) as RouteObject

export const appRoutes: RouteObject[] = [
  r(undefined, shell, [
    r(undefined, home),
    r("products", products),
    r("p/:productSlug", productDetail),
    r("cart", cart),
    r(undefined, publicOnly, [r("login", login)]),
    r(undefined, requireAuth, [
      r("orders", orders),
      r("orders/:orderId", orderDetail),
      r("checkout", checkoutLayout, [
        r(undefined, checkoutIndex),
        r("address", checkoutAddress),
        r("delivery", checkoutDelivery),
        r("payment", checkoutPayment),
        r("review", checkoutReview),
      ]),
      r("checkout/success/:orderId", checkoutSuccess),
      r("account", account, [r(undefined, accountIndex)]),
    ]),
    r("*", notFound),
  ]),
]
