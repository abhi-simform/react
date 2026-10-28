import { filterProducts, sortProducts } from "@/features/catalog/utils"

import addressesRaw from "../fixtures/api/addresses.json"
import brandsRaw from "../fixtures/api/brands.json"
import cartRaw from "../fixtures/api/cart.json"
import categoriesRaw from "../fixtures/api/categories.json"
import meRaw from "../fixtures/api/me.json"
import orderDetailRaw from "../fixtures/api/order-detail.json"
import ordersRaw from "../fixtures/api/orders.json"
import productDetailRaw from "../fixtures/api/product-detail.json"
import { productsFixture } from "../fixtures/products"

/**
 * The fake backend's data (12.4): captured from the real API (seeded dev DB) so the shapes are
 * REAL, and every response still goes through the app's Zod schemas, so a drifting fixture
 * fails a test instead of hiding. `resetDb()` runs before every test (setup.ts).
 */
const clone = <T>(value: T): T => structuredClone(value)

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export const user = meRaw.data
export const productDetail = productDetailRaw.data
export const productList = productsFixture

export type Db = {
  cart: Json
  /** The guest's cart (identified by the `x-cart-token` header): starts empty. */
  guestCart: Json
  wishlist: Set<string>
  orders: Json[]
  addresses: Json[]
  hits: Record<string, number>
}

/** The captured seed cart has a price change on one line (a seeded edge case): start clean. */
function tidyCart(cart: Json): Json {
  const clean = (l: Json) => ({
    ...l,
    priceChanged: false,
    previousPrice: l.unitPrice,
  })
  return { ...cart, items: cart.items.map(clean), saved: cart.saved.map(clean) }
}

function freshDb(): Db {
  const orders = clone(ordersRaw.data) as Json[]
  // one order that can still be cancelled
  orders[0] = { ...clone(orderDetailRaw.data), status: "placed" }
  return {
    cart: tidyCart(clone(cartRaw.data)),
    guestCart: { ...clone(cartRaw.data), items: [], saved: [], coupon: null },
    wishlist: new Set(["wish-1"]),
    orders,
    addresses: clone(addressesRaw.data),
    hits: {},
  }
}

export let db: Db = freshDb()
export const resetDb = () => {
  db = freshDb()
}
export const hit = (name: string) => (db.hits[name] = (db.hits[name] ?? 0) + 1)

export const categories = categoriesRaw.data
export const brands = brandsRaw.data

/** The money block of a cart, derived from its lines (whole rupees, 18% tax, free over 499). */
export function recomputeCart(cart: Json): Json {
  const items = cart.items as Json[]
  const subtotal = items.reduce((s, l) => s + l.unitPrice * l.qty, 0)
  const mrpTotal = items.reduce((s, l) => s + l.mrp * l.qty, 0)
  const discount =
    cart.coupon && "discount" in cart.coupon ? cart.coupon.discount : 0
  const shipping = items.length === 0 || subtotal - discount > 499 ? 0 : 40
  const tax = Math.round(((subtotal - discount) * 18) / 100)
  return {
    ...cart,
    totals: {
      lineCount: items.length,
      unitCount: items.reduce((s, l) => s + l.qty, 0),
      subtotal,
      mrpTotal,
      savings: mrpTotal - subtotal + discount,
      discount,
      shipping,
      tax,
      total: subtotal - discount + shipping + tax,
    },
    hasIssues: false,
  }
}

type ListParams = URLSearchParams
export function listProducts(params: ListParams) {
  const brandsParam = params.get("brand")
  const filters = {
    brands: brandsParam ? brandsParam.split(",") : undefined,
    minPrice: params.has("minPrice")
      ? Number(params.get("minPrice"))
      : undefined,
    maxPrice: params.has("maxPrice")
      ? Number(params.get("maxPrice"))
      : undefined,
    minRating: params.has("minRating")
      ? Number(params.get("minRating"))
      : undefined,
    inStockOnly: params.get("inStock") === "true",
    search: params.get("search") ?? undefined,
  }
  const sortMap: Record<string, Parameters<typeof sortProducts>[1]> = {
    price_asc: "price_asc",
    price_desc: "price_desc",
    rating: "rating",
    newest: "newest",
    discount: "discount",
  }
  const sorted = sortProducts(
    filterProducts(productList, filters),
    sortMap[params.get("sort") ?? ""] ?? "relevance"
  )
  const page = Math.max(1, Number(params.get("page") ?? 1))
  const limit = Number(params.get("limit") ?? 12)
  const data = sorted.slice((page - 1) * limit, page * limit)
  const brandCount = new Map<string, number>()
  for (const p of filterProducts(productList, {
    ...filters,
    brands: undefined,
  }))
    brandCount.set(p.brand, (brandCount.get(p.brand) ?? 0) + 1)
  const prices = sorted.map((p) => p.price)
  return {
    data,
    meta: {
      page,
      limit,
      total: sorted.length,
      totalPages: Math.max(1, Math.ceil(sorted.length / limit)),
      hasNext: page * limit < sorted.length,
      hasPrev: page > 1,
      facets: {
        brands: [...brandCount].map(([value, count]) => ({ value, count })),
        price: { min: Math.min(...prices, 0), max: Math.max(...prices, 0) },
        rating: [4, 3, 2, 1].map((v) => ({
          value: v,
          count: sorted.filter((p) => p.ratingAvg >= v).length,
        })),
        inStock: { count: sorted.filter((p) => p.stock > 0).length },
      },
    },
  }
}
