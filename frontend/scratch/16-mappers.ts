// Run: node --import ./scratch/register-alias.mjs scratch/16-mappers.ts
// 6.7: view-model mappers and Intl helpers, pure (no backend).
import assert from "node:assert/strict"

import { toProductCardVM, toProductDetailVM } from "@/features/catalog/mappers"
import {
  formatCount,
  formatDate,
  formatRelative,
  toPriceVM,
} from "@/lib/format"

const base = {
  _id: "1",
  slug: "p-1",
  name: "Phone",
  brand: "Acme",
  images: [{ url: "https://x.test/a.png" }],
  price: 750,
  mrp: 1000,
  ratingAvg: 4.3,
  ratingCount: 1234,
  stock: 3,
}

const card = toProductCardVM(base)
assert.equal(card.price.current, "₹750")
assert.equal(card.price.mrp, "₹1,000")
assert.equal(card.price.discountLabel, "25% off")
assert.deepEqual(card.rating, { value: 4.3, count: 1234, countLabel: "1.2K" })
assert.equal(card.stockNote, "Only 3 left")
assert.equal(card.image.alt, "Phone (image 1)")

// missing image, no rating, out of stock, no discount: still sensible
const bare = toProductCardVM({
  ...base,
  images: [],
  ratingCount: 0,
  ratingAvg: 0,
  stock: 0,
  mrp: 750,
})
assert.equal(bare.image.url, "/placeholder.svg")
assert.equal(bare.rating, null)
assert.equal(bare.inStock, false)
assert.equal(bare.stockNote, "Out of stock")
assert.equal(bare.price.mrp, null)
assert.equal(bare.price.discountLabel, null)

// locale and currency are parameters
assert.equal(
  toPriceVM(1999, undefined, { locale: "en-US", currency: "USD" }).current,
  "$1,999"
)
assert.equal(formatCount(1234, "en-US"), "1.2K")
assert.equal(formatCount(100000), "1L") // en-IN default: lakh
assert.equal(
  formatDate("2026-10-12T00:00:00Z", { timeZone: "UTC" }),
  "12 Oct 2026"
)
assert.equal(formatDate("garbage"), "")
const now = new Date("2026-10-28T12:00:00Z")
assert.equal(formatRelative("2026-10-25T12:00:00Z", { now }), "3 days ago")
assert.equal(formatRelative("2026-10-28T14:00:00Z", { now }), "in 2 hours")

const detail = toProductDetailVM(
  {
    ...base,
    categoryPath: [],
    category: { _id: "c", name: "C", slug: "c" },
    tags: [],
    discountPercent: 25,
    sku: "S",
    soldCount: 0,
    isFeatured: false,
    status: "active",
    seller: "s",
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-25T12:00:00.000Z",
    description: "d",
    highlights: [],
    specs: [],
  },
  now
)
assert.equal(detail.updatedAgo, "3 days ago")
assert.equal(detail.images.length, 1)
console.log("16-mappers: all assertions passed")
