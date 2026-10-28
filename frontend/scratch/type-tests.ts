// Compile-time checks only (never executed). `tsc` fails if a directive becomes unused.
import { getProduct, getProducts } from "../app/features/catalog/api.ts"
import { api } from "../app/lib/api/client.ts"
import type { Paginated } from "../app/lib/api/envelope.ts"
import {
  productQuerySchema,
  productSchema,
} from "../app/features/catalog/schemas.ts"
import type { z } from "zod"
import { groupBy } from "../app/lib/groupBy.ts"
import type { Product, ProductDetail } from "../app/features/catalog/schemas.ts"
import type { CartItem, Order } from "../app/types/domain.ts"

// api<T> returns exactly T
export const a: Promise<Product[]> = api<Product[]>("/products")
// @ts-expect-error a Promise<Product[]> is not a Promise<string>
export const b: Promise<string> = api<Product[]>("/products")

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

// With a schema, T is INFERRED from it: no generic argument, no lie.
const opts = { schema: productSchema }
export const inferred: Promise<Product> = api("/products/x", opts)
// @ts-expect-error the schema says Product, not string
export const wrong: Promise<string> = api("/products/x", opts)

// z.input (what you feed the schema) vs z.infer / z.output (what you get back)
type QueryIn = z.input<typeof productQuerySchema>
type QueryOut = z.infer<typeof productQuerySchema>
export const qin: QueryIn = { brand: "Apple,boAt", minPrice: "100" } // raw strings
const base = { page: 1, limit: 20, sort: "relevance" } as const
export const qout: QueryOut = { ...base, brand: ["Apple"], minPrice: 100 }
// @ts-expect-error the OUTPUT brand is an array, not the raw csv string
export const qbad: QueryOut = { ...base, brand: "Apple,boAt" }
