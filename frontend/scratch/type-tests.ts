// Compile-time checks only (never executed). `tsc` fails if a directive becomes unused.
import { getProduct, getProducts } from "../app/features/catalog/api.ts"
import { request } from "../app/lib/api/client.ts"
import type { Paginated } from "../app/lib/api/envelope.ts"
import { groupBy } from "../app/lib/groupBy.ts"
import type {
  CartItem,
  Order,
  Product,
  ProductDetail,
} from "../app/types/domain.ts"

// request<T> returns exactly T
export const a: Promise<Product[]> = request<Product[]>("/products")
// @ts-expect-error a Promise<Product[]> is not a Promise<string>
export const b: Promise<string> = request<Product[]>("/products")

// a wrong generic fails where the result is used
export const c: Promise<Paginated<Product>> = getProducts()
// @ts-expect-error Paginated<Product> is not Paginated<Order>
export const d: Promise<Paginated<Order>> = getProducts()
export const e: Promise<ProductDetail> = getProduct("x")

// ReturnType / Awaited
export type ProductsPage = Awaited<ReturnType<typeof getProducts>>
export const items: ProductsPage["items"] = [] satisfies Product[]

// groupBy infers T and K
declare const products: Product[]
export const byBrand = groupBy(products, (p) => p.brand) // Record<string, Product[]>
export const first: Product[] = byBrand["Apple"] ?? []
export const byStatus = groupBy(products, (p) => p.status) // Record<ProductStatus, Product[]>
// @ts-expect-error "sold" is not a ProductStatus key
export const nope = byStatus.sold
// @ts-expect-error K must be a PropertyKey: a boolean is not
export const bad = groupBy(products, (p) => p.isFeatured && { not: "a key" })

// Omit / Pick / Partial
export const input: Omit<CartItem, "priceSnapshot"> = {
  sku: "A",
  qty: 1,
  savedForLater: false,
}
export const input2: Omit<CartItem, "priceSnapshot"> = {
  sku: "A",
  qty: 1,
  savedForLater: false,
  // @ts-expect-error priceSnapshot was omitted, so it is an excess property
  priceSnapshot: 1,
}
