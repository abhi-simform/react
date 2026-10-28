import { http, HttpResponse, type RequestHandler } from "msw"

import cartRaw from "../fixtures/api/cart.json"
import {
  brands,
  categories,
  db,
  hit,
  listProducts,
  productList,
  productDetail,
  recomputeCart,
  user,
} from "./db"

export const API = "http://localhost:4000/api/v1"

export const ok = <T>(data: T, init?: ResponseInit & { meta?: unknown }) =>
  HttpResponse.json(
    { success: true, data, ...(init?.meta ? { meta: init.meta } : {}) },
    init
  )
export const fail = (
  status: number,
  code: string,
  message: string,
  details?: unknown
) =>
  HttpResponse.json(
    { success: false, error: { code, message, details } },
    { status }
  )

/** A fake (unsigned) JWT the app can decode `exp` from. */
export const fakeToken = (expiresInSeconds = 900) => {
  const b64 = (o: object) => btoa(JSON.stringify(o))
  return `${b64({ alg: "none" })}.${b64({ sub: user.id, exp: Math.floor(Date.now() / 1000) + expiresInSeconds })}.sig`
}
/** Guests send `x-cart-token`, signed-in users a bearer token: two different carts. */
const cartFor = (request: Request) =>
  request.headers.has("x-cart-token") ? db.guestCart : db.cart

export const authBody = () => ({ user, accessToken: fakeToken() })

const orderPage = (items: unknown[]) => ({
  data: items,
  meta: {
    page: 1,
    limit: 8,
    total: items.length,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
})

/**
 * Default HAPPY handlers for the whole API (12.4). A test overrides one with `server.use(...)`.
 * Anything not listed here is an unhandled request and fails the test (onUnhandledRequest: "error").
 */
export const handlers: RequestHandler[] = [
  // ---- catalog
  http.get(`${API}/products`, ({ request }) => {
    const { data, meta } = listProducts(new URL(request.url).searchParams)
    return ok(data, { meta })
  }),
  http.get(`${API}/products/:idOrSlug`, ({ params }) =>
    params.idOrSlug === productDetail.slug ||
    params.idOrSlug === productDetail._id
      ? ok(productDetail)
      : fail(404, "NOT_FOUND", "Product not found")
  ),
  http.get(`${API}/categories`, () => ok(categories)),
  http.get(`${API}/brands`, () => ok(brands)),

  // ---- auth
  http.post(`${API}/auth/refresh`, () => {
    hit("refresh")
    return ok(authBody())
  }),
  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string }
    return body.email === user.email && body.password === "Password123"
      ? ok(authBody())
      : fail(401, "INVALID_CREDENTIALS", "Invalid email or password")
  }),
  http.post(
    `${API}/auth/logout`,
    () => new HttpResponse(null, { status: 204 })
  ),
  http.get(`${API}/users/me`, () => ok(user)),

  // ---- cart
  http.get(`${API}/cart`, ({ request }) => ok(recomputeCart(cartFor(request)))),
  http.post(`${API}/cart/items`, async ({ request }) => {
    const cart = cartFor(request)
    const { productId, qty } = (await request.json()) as {
      productId: string
      qty: number
    }
    const existing = cart.items.find(
      (l: { productId: string }) => l.productId === productId
    )
    if (existing) existing.qty += qty
    else {
      const product =
        productDetail._id === productId ? productDetail : undefined
      // re-adding a line that WAS in the fixture cart (Undo) restores it as it was
      const known = [...cartRaw.data.items, ...cartRaw.data.saved].find(
        (l) => l.productId === productId
      )
      cart.items.push(
        known
          ? { ...known, qty }
          : {
              ...(cart.items[0] ?? cartRaw.data.items[0]),
              productId,
              sku: product?.sku ?? `SKU-${productId}`,
              slug: product?.slug ?? productId,
              name: product?.name ?? `Product ${productId}`,
              unitPrice: product?.price ?? 100,
              mrp: product?.mrp ?? 120,
              qty,
            }
      )
    }
    return ok(recomputeCart(cart))
  }),
  http.patch(`${API}/cart/items/:productId`, async ({ params, request }) => {
    const cart = cartFor(request)
    const patch = (await request.json()) as { qty?: number }
    const line = cart.items.find(
      (l: { productId: string }) => l.productId === params.productId
    )
    if (line && patch.qty) line.qty = patch.qty
    return ok(recomputeCart(cart))
  }),
  http.delete(`${API}/cart/items/:productId`, ({ params, request }) => {
    const cart = cartFor(request)
    cart.items = cart.items.filter(
      (l: { productId: string }) => l.productId !== params.productId
    )
    return ok(recomputeCart(cart))
  }),
  http.post(`${API}/cart/coupon`, async ({ request }) => {
    const { code } = (await request.json()) as { code: string }
    if (code === "SAVE10") {
      db.cart.coupon = { code, description: "10% off", discount: 100 }
      return ok(recomputeCart(db.cart))
    }
    if (code === "BIGSPEND")
      return fail(422, "COUPON_INVALID", "Coupon not valid", {
        reason: "MIN_ORDER",
        minOrder: 9999,
        shortBy: 4000,
      })
    return fail(422, "COUPON_INVALID", "Coupon not valid", {
      reason: "UNKNOWN",
    })
  }),
  http.get(`${API}/coupons/available`, () => ok([])),
  http.get(`${API}/coupons/offers`, () => ok([])),
  http.post(`${API}/cart/merge`, () =>
    ok({ ...recomputeCart(db.cart), merge: { merged: 0, adjusted: [] } })
  ),

  // ---- wishlist
  http.get(`${API}/wishlist/ids`, () => ok([...db.wishlist])),
  http.post(`${API}/wishlist`, async ({ request }) => {
    const { productId } = (await request.json()) as { productId: string }
    db.wishlist.add(productId)
    return ok({ productId }, { status: 201 })
  }),
  http.delete(`${API}/wishlist/:productId`, ({ params }) => {
    db.wishlist.delete(String(params.productId))
    return new HttpResponse(null, { status: 204 })
  }),

  // ---- orders
  http.get(`${API}/orders`, () =>
    ok(
      ...(() => {
        const p = orderPage(db.orders)
        return [p.data, { meta: p.meta }] as const
      })()
    )
  ),
  http.get(`${API}/orders/:id`, ({ params }) => {
    const order = db.orders.find((o) => o.id === params.id)
    return order ? ok(order) : fail(404, "NOT_FOUND", "Order not found")
  }),
  http.post(`${API}/orders/:id/cancel`, ({ params }) => {
    const order = db.orders.find((o) => o.id === params.id)
    if (!order) return fail(404, "NOT_FOUND", "Order not found")
    order.status = "cancelled"
    return ok(order)
  }),

  // ---- addresses
  http.get(`${API}/addresses`, () => ok(db.addresses)),
  http.post(`${API}/addresses`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const created = {
      id: `addr-${db.addresses.length + 1}`,
      createdAt: "2026-10-28T00:00:00Z",
      updatedAt: "2026-10-28T00:00:00Z",
      line2: null,
      landmark: null,
      ...body,
    }
    db.addresses.push(created)
    return ok(created, { status: 201 })
  }),

  // ---- delivery
  http.get(`${API}/pincodes/:pincode`, ({ params }) => {
    const pincode = String(params.pincode)
    if (pincode.startsWith("9")) return ok({ serviceable: false, pincode })
    const day = 86_400_000
    return ok({
      serviceable: true,
      pincode,
      zone: "metro",
      state: "Karnataka",
      codAvailable: true,
      deliveryDays: { min: 1, max: 2 },
      estimatedDelivery: {
        from: new Date(Date.now() + day).toISOString(),
        to: new Date(Date.now() + 2 * day).toISOString(),
      },
    })
  }),

  // ---- shell and home chatter (quiet, valid, empty)
  http.get(`${API}/banners`, () => ok([])),
  http.get(`${API}/deals`, () => ok([])),
  http.get(`${API}/time`, () =>
    ok({ epochMs: Date.now(), now: new Date().toISOString() })
  ),
  http.get(`${API}/health`, () =>
    ok({ status: "ok", db: "up", uptime: 1, time: new Date().toISOString() })
  ),
  http.get(`${API}/search/suggest`, ({ request }) => {
    const q = (new URL(request.url).searchParams.get("q") ?? "").toLowerCase()
    return ok({
      query: q,
      products: productList
        .filter((p) => p.name.toLowerCase().includes(q))
        .slice(0, 5)
        .map((p) => ({
          id: p._id,
          name: p.name,
          slug: p.slug,
          brand: p.brand,
          price: p.price,
          image: p.images[0]?.url ?? null,
          category: p.category
            ? { name: p.category.name, slug: p.category.slug }
            : null,
        })),
      categories: [],
      brands: [],
      correction: null,
    })
  }),

  // ---- the header's chatter: keep these quiet and valid
  http.get(`${API}/notifications/unread-count`, () => ok({ count: 0 })),
  http.get(`${API}/notifications`, () =>
    ok([], {
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    })
  ),
]
