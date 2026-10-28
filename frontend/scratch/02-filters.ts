// Run: node scratch/02-filters.ts
// Expected counts were computed independently with a throwaway Python script
// over products.json (not with the code under test).
import assert from "node:assert/strict"

import {
  filterProducts,
  filterWithFacets,
} from "../app/features/catalog/utils.ts"
import type { Product } from "../app/features/catalog/types.ts"
import { loadProducts } from "./load-products.ts"
import { deepFreeze } from "../app/lib/immutable.ts"

const products = deepFreeze(loadProducts())
const count = (f: Parameters<typeof filterProducts>[1]) =>
  filterProducts(products, f).length

// empty filters do not restrict
assert.equal(count({}), 308)
assert.equal(count({ brands: [], search: "  " }), 308)

// each filter alone
assert.equal(count({ brands: ["Apple"] }), 12)
assert.equal(count({ brands: ["Apple", "boAt"] }), 19)
assert.equal(count({ minPrice: 1000, maxPrice: 5000 }), 99)
assert.equal(count({ minRating: 4.5 }), 82)
assert.equal(count({ inStockOnly: true }), 277)
assert.equal(count({ minDiscount: 50 }), 43)
assert.equal(count({ search: "SHIRT" }), 10) // case-insensitive
assert.equal(count({ search: "h&m" }), 13) // matches brand too

// combinations
assert.equal(count({ brands: ["Apple"], minRating: 4.5 }), 2)
assert.equal(count({ maxPrice: 2000, inStockOnly: true, minDiscount: 30 }), 30)
assert.equal(
  count({ brands: ["boAt", "Noise"], minPrice: 1000, minRating: 4 }),
  7
)
assert.equal(count({ search: "watch", inStockOnly: true }), 12)
assert.equal(
  count({
    brands: ["H&M"],
    minPrice: 500,
    maxPrice: 3000,
    minRating: 3.5,
    inStockOnly: true,
    minDiscount: 10,
  }),
  5
)

// purity: input untouched, new array returned
const out = filterProducts(products, {})
assert.notEqual(out, products)

// disjunctive facets: with brands=[Apple] & minRating 4.5, other brands still counted
const { items, facets } = filterWithFacets(products, {
  brands: ["Apple"],
  minRating: 4.5,
})
assert.equal(items.length, 2)
assert.equal(facets.brands["Apple"], 2)
assert.equal(facets.brands["OnePlus"], 4)

console.log("1.2 ok")
