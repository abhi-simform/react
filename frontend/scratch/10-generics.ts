// Run: node --import ./scratch/register-alias.mjs scratch/10-generics.ts  (needs backend)
import assert from "node:assert/strict"

import { getProduct, getProducts } from "@/features/catalog/api"
import { request } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import { groupBy } from "@/lib/groupBy"
import { toQueryString } from "@/lib/api/query"
import type { Product } from "@/types/domain"

const page = await getProducts({
  limit: 3,
  sort: "price_asc",
  brand: ["Apple", "boAt"],
})
assert.equal(page.items.length, 3)
assert.equal(page.meta.limit, 3)
assert.ok(page.items.every((p) => p.brand === "Apple" || p.brand === "boAt"))

const detail = await getProduct(page.items[0]!.slug)
assert.equal(detail._id, page.items[0]!._id)
assert.ok(Array.isArray(detail.specs))

const raw = await request<Product[]>("/products?limit=2")
assert.equal(raw.length, 2)

await assert.rejects(
  request("/nope"),
  (e: unknown) => e instanceof ApiError && e.status === 404
)
await assert.rejects(
  getProducts({ limit: 1000 }),
  (e: unknown) =>
    e instanceof ApiError && e.status === 422 && e.code === "VALIDATION_ERROR"
)

assert.equal(
  toQueryString({ a: 1, b: undefined, c: "", d: ["x", "y"], e: [], f: false }),
  "?a=1&d=x%2Cy&f=false"
)
assert.equal(toQueryString({}), "")

const grouped = groupBy(["apple", "avocado", "banana"], (s) => s[0])
assert.deepEqual(grouped, { a: ["apple", "avocado"], b: ["banana"] })
console.log("2.4 ok")
