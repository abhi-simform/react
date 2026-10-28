import { describe, expect, it } from "vitest"

import {
  addLine,
  clampToStock,
  removeLine,
  restoreLine,
  setLineQty,
  snapshotLine,
  updateQty,
} from "./lines"
import type { CartLineInput, GuestCartLine } from "./types"

const input = (sku: string, stock = 5): CartLineInput => ({
  sku,
  productId: `p-${sku}`,
  slug: sku,
  name: sku,
  imageUrl: "x.png",
  unitPrice: 100_00,
  stock,
})
const guest = (sku: string, qty = 1, stock = 5): GuestCartLine => ({
  ...input(sku, stock),
  qty,
})

describe("clampToStock", () => {
  it.each([
    [3, 5, 3],
    [9, 5, 5],
    [0, 5, 0],
    [-4, 5, 0],
    [2.9, 5, 2],
    [3, 0, 0],
    [3, -2, 0],
  ])("qty %d with stock %d -> %d", (qty, stock, expected) => {
    expect(clampToStock(qty, stock)).toBe(expected)
  })
  // Found by test: NaN (an empty number input) leaked through Math.min/max as NaN.
  it("never returns NaN", () => {
    expect(clampToStock(NaN, 5)).toBe(0)
    expect(clampToStock(3, NaN)).toBe(0)
  })
})

describe("addLine", () => {
  it("adds a new line", () => {
    const r = addLine([], input("a"), 2)
    expect(r.lines).toEqual([{ ...input("a"), qty: 2 }])
    expect(r).toMatchObject({ qty: 2, clamped: false })
  })
  it("increments an existing sku instead of duplicating", () => {
    const r = addLine([guest("a", 2)], input("a"), 1)
    expect(r.lines).toHaveLength(1)
    expect(r.qty).toBe(3)
  })
  it("clamps to the stock and says so", () => {
    const r = addLine([guest("a", 4)], input("a", 5), 3)
    expect(r).toMatchObject({ qty: 5, clamped: true })
  })
  it.each([0, -1, 1.5, NaN])("ignores qty %s", (qty) => {
    expect(addLine([], input("a"), qty).lines).toEqual([])
  })
  it("adds nothing when out of stock", () => {
    expect(addLine([], input("a", 0), 1).lines).toEqual([])
  })
})

describe("setLineQty / updateQty / removeLine", () => {
  const lines = [guest("a", 1), guest("b", 2)]
  it("qty <= 0 removes", () => {
    expect(setLineQty(lines, "a", 0).lines.map((l) => l.sku)).toEqual(["b"])
    expect(updateQty(lines, "b", -1).map((l) => l.sku)).toEqual(["a"])
  })
  it("clamps to the line's stock", () => {
    expect(setLineQty(lines, "a", 99)).toMatchObject({ qty: 5, clamped: true })
  })
  it("an unknown sku changes nothing", () => {
    expect(setLineQty(lines, "zzz", 3).lines).toEqual(lines)
    expect(removeLine(lines, "zzz")).toEqual(lines)
  })
  it("does not mutate", () => {
    const frozen = Object.freeze(lines.map((l) => Object.freeze(l)))
    expect(() => setLineQty(frozen, "a", 3)).not.toThrow()
  })
})

describe("undo: restoreLine puts the line back where it was", () => {
  it("overlapping removals come back in the original order", () => {
    const all = [guest("a"), guest("b"), guest("c")]
    const removedB = snapshotLine(all, "b")!
    const afterB = removeLine(all, "b")
    const removedA = snapshotLine(afterB, "a")!
    const afterA = removeLine(afterB, "a")
    const undoA = restoreLine(afterA, removedA)
    const undoB = restoreLine(undoA, removedB)
    expect(undoB.map((l) => l.sku)).toEqual(["a", "b", "c"])
  })
  it("a line added again meanwhile keeps its place and gets the old qty", () => {
    const removed = snapshotLine([guest("a", 3)], "a")!
    const restored = restoreLine([guest("a", 1)], removed)
    expect(restored).toHaveLength(1)
    expect(restored[0]?.qty).toBe(3)
  })
  it("snapshot of an unknown sku is undefined", () => {
    expect(snapshotLine([], "a")).toBeUndefined()
  })
})
