// Run: node --import ./scratch/register-alias.mjs scratch/22-cart-store.ts
// 8.3/8.5: cart line logic (add increments, stock clamp, undo keeps position) and the stores.
// (zustand logs "storage is currently unavailable" in Node: there is no localStorage. Expected.)
import assert from "node:assert/strict"

import { useCartStore } from "@/scratch/zustand/legacyCartStore"
import { addLine, restoreLine, setLineQty } from "@/features/cart/lines"
import { freeShippingProgress } from "@/features/cart/totals"
import type { CartLineInput } from "@/features/cart/types"
import { COMPARE_MAX, useCompareStore } from "@/features/compare/compareStore"

const input = (sku: string, stock = 5, unitPrice = 10_000): CartLineInput => ({
  sku,
  productId: `p-${sku}`,
  slug: sku.toLowerCase(),
  name: `Product ${sku}`,
  imageUrl: "x.png",
  unitPrice,
  stock,
})

// ---- pure line logic ---------------------------------------------------------------------
let r = addLine([], input("A"), 2)
assert.deepEqual([r.qty, r.clamped, r.lines.length], [2, false, 1])
r = addLine(r.lines, input("A"), 2) // same sku increments, does not duplicate
assert.deepEqual([r.qty, r.clamped, r.lines.length], [4, false, 1])
r = addLine(r.lines, input("A"), 4) // 8 wanted, stock 5
assert.deepEqual([r.qty, r.clamped], [5, true])
assert.equal(addLine([], input("Z", 0), 1).lines.length, 0) // out of stock: nothing added
assert.equal(addLine([], input("A"), 0).lines.length, 0)
assert.equal(addLine([], input("A"), 1.5).lines.length, 0)
const s = setLineQty(r.lines, "A", 99)
assert.deepEqual([s.qty, s.clamped], [5, true])
assert.equal(setLineQty(r.lines, "A", 0).lines.length, 0) // 0 removes
assert.equal(setLineQty(r.lines, "nope", 3).lines.length, 1) // unknown sku: unchanged

// ---- undo puts the line back at its place, also with overlapping undos --------------------
const abc = ["A", "B", "C"].reduce(
  (lines, sku) => addLine(lines, input(sku), 1 + "ABC".indexOf(sku)).lines,
  [] as ReturnType<typeof addLine>["lines"]
)
const order = abc.map((l) => l.sku)
const removedB = { line: abc[1]!, order }
const removedA = { line: abc[0]!, order: ["A", "C"] }
let after = [abc[2]!] // B and A are gone, only C is left
after = restoreLine(after, removedA)
assert.deepEqual(
  after.map((l) => l.sku),
  ["A", "C"]
)
after = restoreLine(after, removedB)
assert.deepEqual(
  after.map((l) => l.sku),
  ["A", "B", "C"]
)
assert.equal(after[1]!.qty, 2) // same quantity as before
// re-added meanwhile: keep that line, restore only the quantity
const readded = restoreLine([addLine([], input("B"), 1).lines[0]!], removedB)
assert.deepEqual([readded.length, readded[0]!.qty], [1, 2])

// ---- the store ------------------------------------------------------------------------------
const cart = useCartStore
assert.equal(cart.getState().lines.length, 0)
cart.getState().add(input("A"), 2)
cart.getState().add(input("B", 3), 5)
assert.deepEqual(
  cart.getState().lines.map((l) => [l.sku, l.qty]),
  [
    ["A", 2],
    ["B", 3],
  ]
)
const snapshot = cart.getState().remove("A")
assert.ok(snapshot)
assert.deepEqual(
  cart.getState().lines.map((l) => l.sku),
  ["B"]
)
cart.getState().restore(snapshot)
assert.deepEqual(
  cart.getState().lines.map((l) => l.sku),
  ["A", "B"]
)
assert.equal(cart.getState().remove("nope"), undefined)
// subscribers are only told when the state really changed
let calls = 0
const unsubscribe = cart.subscribe(() => calls++)
cart.getState().setDrawerOpen(true)
assert.equal(calls, 1)
unsubscribe()
const before = cart.getState().clear()
assert.equal(before.length, 2)
cart.getState().replaceAll(before)
assert.equal(cart.getState().lines.length, 2)

// ---- free shipping (strictly above 499) -----------------------------------------------------
assert.deepEqual(freeShippingProgress(37_900), {
  remaining: 12_100, // Rs 120 more would land exactly on 499: not free (strictly above)
  ratio: 37_900 / 49_900,
  qualified: false,
})
assert.equal(freeShippingProgress(49_900).qualified, false) // exactly on the line: not yet
assert.equal(freeShippingProgress(49_900).remaining, 100)
assert.equal(freeShippingProgress(50_000).qualified, true)
assert.equal(freeShippingProgress(50_000).remaining, 0)

// ---- compare: max 4, toggle, persists the minimum -----------------------------------------
const item = (id: string) => ({ id, slug: id, name: id, imageUrl: "x" })
const cmp = useCompareStore.getState()
for (const id of ["a", "b", "c", "d"])
  assert.equal(cmp.toggle(item(id)), "added")
assert.equal(cmp.toggle(item("e")), "full")
assert.equal(useCompareStore.getState().items.length, COMPARE_MAX)
assert.equal(cmp.toggle(item("b")), "removed")
assert.equal(useCompareStore.getState().toggle(item("e")), "added")
assert.deepEqual(
  useCompareStore.getState().items.map((i) => i.id),
  ["a", "c", "d", "e"]
)
console.log("22-cart-store: ok")
