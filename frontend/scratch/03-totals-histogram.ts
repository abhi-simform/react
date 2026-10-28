// Run: node scratch/03-totals-histogram.ts
// Expected values below were calculated by hand (paise).
import assert from "node:assert/strict"

import { computeTotals } from "../app/features/cart/totals.ts"
import { brandCounts, priceHistogram } from "../app/features/catalog/utils.ts"
import type { Product } from "../app/features/catalog/types.ts"
import { loadProducts } from "./load-products.ts"
import { toPaise } from "../app/lib/money.ts"

// 1. empty cart: everything zero (needs the explicit reduce initial value)
assert.deepEqual(computeTotals([]), {
  subtotal: 0,
  discount: 0,
  shipping: 0,
  tax: 0,
  total: 0,
  savings: 0,
})

// 2. below free-shipping threshold: 2 x 199.00 = 398.00; +40 ship; tax 71.64
assert.deepEqual(computeTotals([{ sku: "A", qty: 2, unitPrice: 19900 }]), {
  subtotal: 39800,
  discount: 0,
  shipping: 4000,
  tax: 7164,
  total: 50964,
  savings: 0,
})

// 3. above threshold with MRP savings: 250 + 2 x 150 = 550.00, ship free, tax 99.00
assert.deepEqual(
  computeTotals([
    { sku: "A", qty: 1, unitPrice: 25000, mrp: 30000 },
    { sku: "B", qty: 2, unitPrice: 15000, mrp: 15000 },
  ]),
  {
    subtotal: 55000,
    discount: 0,
    shipping: 0,
    tax: 9900,
    total: 64900,
    savings: 5000,
  }
)

// 4. exactly 499.00 is NOT "above 499": shipping still charged; tax 89.82
assert.deepEqual(computeTotals([{ sku: "A", qty: 1, unitPrice: 49900 }]), {
  subtotal: 49900,
  discount: 0,
  shipping: 4000,
  tax: 8982,
  total: 62882,
  savings: 0,
})

// 5. percent coupon hits maxDiscount: 20% of 1000.00 = 200.00, capped at 150.00
assert.deepEqual(
  computeTotals([{ sku: "A", qty: 1, unitPrice: 100000, mrp: 120000 }], {
    coupon: { type: "percent", value: 20, maxDiscount: 15000 },
  }),
  {
    subtotal: 100000,
    discount: 15000,
    shipping: 0,
    tax: 15300,
    total: 100300,
    savings: 35000,
  }
)

// 6. coupon below minOrder: ignored. 3 x 99.00 = 297.00, min order 500.00
assert.deepEqual(
  computeTotals([{ sku: "A", qty: 3, unitPrice: 9900 }], {
    coupon: { type: "percent", value: 10, minOrder: 50000 },
  }),
  {
    subtotal: 29700,
    discount: 0,
    shipping: 4000,
    tax: 5346,
    total: 39046,
    savings: 0,
  }
)

// 7. rounding once: 15% of 99.99 = 14.9985 -> 1500 paise (not 1499.85 stored)
assert.deepEqual(
  computeTotals([{ sku: "A", qty: 3, unitPrice: 3333 }], {
    coupon: { type: "percent", value: 15 },
  }),
  {
    subtotal: 9999,
    discount: 1500,
    shipping: 4000,
    tax: 1530,
    total: 14029,
    savings: 1500,
  }
)

// 8. flat coupon bigger than subtotal never goes negative
assert.equal(
  computeTotals([{ sku: "A", qty: 1, unitPrice: 5000 }], {
    coupon: { type: "flat", value: 99999 },
  }).total,
  4000 // 0 + shipping 40.00 + tax 0
)

// no float artefacts: 0.1 + 0.2 style inputs
assert.notEqual(0.1 + 0.2, 0.3)
assert.equal(toPaise(0.1 + 0.2), 30)
assert.equal(toPaise(199.99), 19999)
for (const t of [
  computeTotals([{ sku: "A", qty: 7, unitPrice: toPaise(19.99) }]),
]) {
  for (const v of Object.values(t)) assert.ok(Number.isInteger(v))
}

// reduce without initial value on empty array:
assert.throws(() => ([] as number[]).reduce((a, b) => a + b), TypeError)

// ---- histogram / brandCounts on the real fixture
const products = loadProducts()
const total = (bs: { count: number }[]) => bs.reduce((s, b) => s + b.count, 0)

for (const n of [1, 5, 10, 20, 1000]) {
  const buckets = priceHistogram(products, n)
  assert.equal(total(buckets), products.length, `buckets=${n}`)
  assert.ok(buckets.length <= n)
}
assert.deepEqual(priceHistogram([], 10), [])
const same = products.slice(0, 5).map((p) => ({ ...p, price: 999 }))
assert.deepEqual(priceHistogram(same, 10), [{ from: 999, to: 999, count: 5 }])
const two = [
  { ...products[0]!, price: 1 },
  { ...products[1]!, price: 3 },
]
assert.deepEqual(
  priceHistogram(two, 5).map((b) => b.count),
  [1, 0, 1]
) // width 1 -> 3 buckets, not 5

const brands = brandCounts(products)
assert.equal(total(brands), products.length)
assert.deepEqual(brands[0], { brand: "H&M", count: 13 })
for (let i = 1; i < brands.length; i++) {
  const prev = brands[i - 1]!,
    cur = brands[i]!
  assert.ok(
    prev.count > cur.count ||
      (prev.count === cur.count && prev.brand.localeCompare(cur.brand) <= 0)
  )
}

console.log("1.3 ok")
