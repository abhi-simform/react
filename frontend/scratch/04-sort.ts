// Run: node scratch/04-sort.ts
import assert from "node:assert/strict"

import {
  compareBy,
  sortProducts,
  type SortKey,
} from "../app/features/catalog/utils.ts"
import type { Product } from "../app/features/catalog/types.ts"
import { loadProducts } from "./load-products.ts"
import { deepFreeze } from "../app/lib/immutable.ts"

const products = deepFreeze(loadProducts())
const snapshot = products.map((p) => p._id)

const keys: SortKey[] = [
  "relevance",
  "price_asc",
  "price_desc",
  "rating",
  "newest",
  "discount",
]
for (const key of keys) {
  const sorted = sortProducts(products, key)
  assert.notEqual(sorted, products, `${key}: new array`)
  assert.equal(sorted.length, products.length)
  assert.deepEqual(
    products.map((p) => p._id),
    snapshot,
    `${key}: original unchanged`
  )
}
assert.deepEqual(
  sortProducts(products, "relevance").map((p) => p._id),
  snapshot
)

const asc = sortProducts(products, "price_asc")
for (let i = 1; i < asc.length; i++)
  assert.ok(asc[i - 1]!.price <= asc[i]!.price)
const desc = sortProducts(products, "price_desc")
for (let i = 1; i < desc.length; i++)
  assert.ok(desc[i - 1]!.price >= desc[i]!.price)

// tie-break: equal price -> rating desc -> name
for (let i = 1; i < asc.length; i++) {
  const a = asc[i - 1]!,
    b = asc[i]!
  if (a.price === b.price) {
    assert.ok(a.ratingAvg >= b.ratingAvg)
    if (a.ratingAvg === b.ratingAvg)
      assert.ok(a.name.localeCompare(b.name) <= 0)
  }
}
const ties = asc.filter((p, i) => asc[i + 1]?.price === p.price).length
console.log(
  `(${ties} products share a price with their neighbour; tie-breakers exercised)`
)

const newest = sortProducts(products, "newest")
for (let i = 1; i < newest.length; i++)
  assert.ok(
    Date.parse(newest[i - 1]!.createdAt) >= Date.parse(newest[i]!.createdAt)
  )

// accents: plain `<` puts "Éclair" after "Zebra"; the collator does not
const names = ["Zebra", "Éclair", "Apple", "eclair2"]
assert.deepEqual(names.toSorted(), ["Apple", "Zebra", "eclair2", "Éclair"])
assert.deepEqual(names.toSorted(compareBy({ get: (s: string) => s })), [
  "Apple",
  "Éclair",
  "eclair2",
  "Zebra",
])

// stability: equal elements keep their original relative order
const pairs = [
  { k: 1, id: "a" },
  { k: 0, id: "b" },
  { k: 1, id: "c" },
  { k: 0, id: "d" },
]
assert.deepEqual(
  pairs
    .toSorted(compareBy({ get: (x: (typeof pairs)[number]) => x.k }))
    .map((x) => x.id),
  ["b", "d", "a", "c"]
)

// frozen input would throw with .sort()
assert.throws(() => products.sort(), TypeError)
console.log("1.4 ok")
