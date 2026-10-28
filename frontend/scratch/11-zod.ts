// Run: node --import ./scratch/register-alias.mjs scratch/11-zod.ts  (needs backend)
import assert from "node:assert/strict"
import { z } from "zod"

import { getProduct, getProducts } from "@/features/catalog/api"
import {
  naiveMinPriceSchema,
  productQuerySchema,
  productSchema,
} from "@/features/catalog/schemas"
import { request } from "@/lib/api/client"
import { ContractError } from "@/lib/api/errors"
import { apiEnvelopeSchema, paginatedSchema } from "@/lib/api/schemas"

import { loadProducts } from "./load-products.ts"

// 1. every one of the 308 snapshot products satisfies the schema (loadProducts parses them)
assert.equal(loadProducts().length, 308)

// 2. live API: validated list + detail
const page = await getProducts({ limit: 5 })
assert.equal(page.items.length, 5)
const detail = await getProduct(page.items[0]!.slug)
assert.ok(detail.description.length > 0)
assert.ok(detail.categoryPath.every((c) => typeof c.slug === "string"))

// 3. parse throws, safeParse returns
assert.throws(() => productSchema.parse({ nope: true }), z.ZodError)
const bad = productSchema.safeParse({ ...page.items[0], price: "59999" })
assert.equal(bad.success, false)
if (!bad.success) {
  assert.deepEqual(bad.error.issues[0]?.path, ["price"])
  console.log("safeParse issue:", bad.error.issues[0]?.message)
}

// 4. break the contract deliberately: the schema expects `title`, the API sends `name`
const renamed = productSchema.omit({ name: true }).extend({ title: z.string() })
const err = await request("/products?limit=2", {
  // list endpoints return an array in `data`
  schema: z.array(renamed),
}).catch((e: unknown) => e)
assert.ok(err instanceof ContractError)
assert.equal(err.path, "data.0.title")
console.log("ContractError:", err.message)

// a wrong field TYPE (price as string) also pinpoints the path
const priceAsString = productSchema.extend({ price: z.string() })
const err2 = await request("/products?limit=1", {
  schema: z.array(priceAsString),
}).catch((e: unknown) => e)
assert.ok(err2 instanceof ContractError)
assert.equal(err2.path, "data.0.price")
console.log("ContractError:", err2.message)

// 5. envelope helpers
assert.equal(
  apiEnvelopeSchema(z.number()).safeParse({ success: true, data: 1 }).success,
  true
)
assert.equal(
  apiEnvelopeSchema(z.number()).safeParse({ success: false, data: 1 }).success,
  false
)
assert.equal(
  paginatedSchema(z.number()).safeParse({ success: true, data: [1] }).success,
  false,
  "meta required"
)

// 6. z.coerce.number(): "" -> 0 pitfall
assert.equal(
  naiveMinPriceSchema.parse(""),
  0,
  "PITFALL: empty string coerces to 0"
)
assert.equal(naiveMinPriceSchema.parse("12"), 12)
assert.equal(
  naiveMinPriceSchema.safeParse("abc").success,
  false,
  "NaN is rejected"
)
// guarded version
const q = productQuerySchema.parse({
  minPrice: "",
  maxPrice: "500",
  brand: "Apple, boAt,,",
  page: "2",
})
assert.equal(q.minPrice, undefined, "empty -> absent")
assert.equal(q.maxPrice, 500)
assert.deepEqual(q.brand, ["Apple", "boAt"])
assert.equal(q.page, 2)
assert.equal(q.limit, 20, "default")
assert.equal(productQuerySchema.safeParse({ limit: "1000" }).success, false)
assert.equal(productQuerySchema.safeParse({ sort: "bogus" }).success, false)

console.log("2.6 ok")
