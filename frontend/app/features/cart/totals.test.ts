import { describe, expect, it } from "vitest"

import { computeTotals, freeShippingProgress } from "./totals"
import type { CartLine, CouponRule } from "./types"

const line = (unitPrice: number, qty = 1, mrp?: number): CartLine => ({
  sku: `sku-${unitPrice}-${qty}`,
  qty,
  unitPrice,
  mrp,
})

describe("computeTotals", () => {
  it("an empty cart costs nothing (and ships nothing)", () => {
    expect(computeTotals([])).toEqual({
      subtotal: 0,
      discount: 0,
      shipping: 0,
      tax: 0,
      total: 0,
      savings: 0,
    })
  })

  it("adds shipping below the free threshold and tax on the subtotal", () => {
    const t = computeTotals([line(100_00)]) // Rs 100
    expect(t).toMatchObject({
      subtotal: 100_00,
      shipping: 40_00,
      tax: 18_00,
      total: 158_00,
    })
  })

  describe("free shipping is strictly ABOVE the threshold", () => {
    it.each([
      [499_00 - 1, 40_00],
      [499_00, 40_00], // exactly on it still pays
      [499_00 + 1, 0],
    ])("subtotal %i paise -> shipping %i", (price, shipping) => {
      expect(computeTotals([line(price)]).shipping).toBe(shipping)
    })
    it("uses the DISCOUNTED subtotal", () => {
      const coupon: CouponRule = { type: "flat", value: 200_00 }
      expect(computeTotals([line(600_00)]).shipping).toBe(0)
      expect(computeTotals([line(600_00)], { coupon }).shipping).toBe(40_00)
    })
  })

  describe("coupons", () => {
    const cart = [line(1_000_00)]
    it.each<[string, CouponRule, number]>([
      ["10% percent", { type: "percent", value: 10 }, 100_00],
      [
        "percent capped by maxDiscount",
        { type: "percent", value: 50, maxDiscount: 150_00 },
        150_00,
      ],
      ["flat", { type: "flat", value: 75_00 }, 75_00],
      [
        "flat larger than the subtotal never goes negative",
        { type: "flat", value: 5_000_00 },
        1_000_00,
      ],
      [
        "minOrder not reached -> nothing",
        { type: "percent", value: 10, minOrder: 1_000_01 },
        0,
      ],
      [
        "minOrder exactly reached -> applies",
        { type: "percent", value: 10, minOrder: 1_000_00 },
        100_00,
      ],
      ["100% = everything", { type: "percent", value: 100 }, 1_000_00],
    ])("%s", (_name, coupon, discount) => {
      const t = computeTotals(cart, { coupon })
      expect(t.discount).toBe(discount)
      expect(t.total).toBe(t.subtotal - discount + t.shipping + t.tax)
    })

    it("rounds each derived amount once (percent of an odd amount)", () => {
      const t = computeTotals([line(333_33)], {
        coupon: { type: "percent", value: 15 },
      })
      expect(t.discount).toBe(Math.round(333_33 * 0.15))
      expect(Number.isInteger(t.tax)).toBe(true)
      expect(Number.isInteger(t.total)).toBe(true)
    })

    it("a coupon on an empty cart does nothing", () => {
      expect(
        computeTotals([], { coupon: { type: "flat", value: 100_00 } }).discount
      ).toBe(0)
    })
  })

  it("savings = list price gap + coupon", () => {
    const t = computeTotals([line(80_00, 2, 100_00)], {
      coupon: { type: "flat", value: 10_00 },
    })
    expect(t.savings).toBe(2 * 20_00 + 10_00)
  })
  it("never mutates its input", () => {
    const lines = Object.freeze([Object.freeze(line(10_00, 3))])
    expect(() => computeTotals(lines)).not.toThrow()
  })
})

describe("freeShippingProgress", () => {
  it.each([
    [0, 500_00, 0, false],
    [499_00, 100, 1, false], // on the threshold: bar full, but one more rupee needed
    [499_01, 0, 1, true],
    [10_000_00, 0, 1, true],
  ])("subtotal %i", (subtotal, remaining, ratio, qualified) => {
    const p = freeShippingProgress(subtotal)
    expect(p.remaining).toBe(remaining)
    expect(p.ratio).toBeCloseTo(ratio, 2)
    expect(p.qualified).toBe(qualified)
  })
  it("a zero threshold means always qualified", () => {
    expect(freeShippingProgress(0, { freeAbove: 0, fee: 40_00 }).ratio).toBe(1)
  })
})
