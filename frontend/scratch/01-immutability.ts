// Run: node scratch/01-immutability.ts   (Node 24 strips types)
import assert from "node:assert/strict"

import { removeLine, updateQty } from "../app/features/cart/lines.ts"
import { deepFreeze, toggle } from "../app/lib/immutable.ts"

const lines = deepFreeze([
  { sku: "A", qty: 1, unitPrice: 1000 },
  { sku: "B", qty: 2, unitPrice: 500 },
])

// Nothing below throws, even though the input is frozen and this file is strict.
const bumped = updateQty(lines, "A", 3)
assert.equal(bumped[0]?.qty, 3)
assert.equal(lines[0]?.qty, 1, "input untouched")
assert.notEqual(bumped, lines)
assert.equal(bumped[1], lines[1], "unchanged lines keep their reference")

assert.deepEqual(removeLine(lines, "A").map((l) => l.sku), ["B"])
assert.deepEqual(updateQty(lines, "B", 0).map((l) => l.sku), ["A"])
assert.equal(lines.length, 2)

const selected = deepFreeze(new Set(["x"]))
const next = toggle(selected, "y")
assert.deepEqual([...next], ["x", "y"])
assert.deepEqual([...toggle(next, "x")], ["y"])
assert.deepEqual([...selected], ["x"])

// Proof that mutation WOULD throw on frozen data:
assert.throws(() => (lines as { sku: string }[]).push({ sku: "C" }), TypeError)

console.log("1.1 ok")
