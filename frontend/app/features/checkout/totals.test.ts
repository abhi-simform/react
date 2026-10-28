import { describe, expect, it } from "vitest"

import { EXPRESS_FEE } from "./slots"
import { COD_MAX_TOTAL, withDelivery } from "./totals"

const totals = {
  subtotal: 1000_00,
  discount: 0,
  shipping: 40_00,
  tax: 180_00,
  total: 1220_00,
  savings: 0,
}

describe("withDelivery", () => {
  it("standard keeps the server's totals", () => {
    expect(withDelivery(totals, "standard")).toEqual(totals)
  })
  it("express REPLACES the shipping fee and re-derives the total", () => {
    const t = withDelivery(totals, "express")
    expect(t.shipping).toBe(EXPRESS_FEE)
    expect(t.total).toBe(totals.total - 40_00 + EXPRESS_FEE)
  })
  it("express on an order with free shipping adds the full fee", () => {
    const t = withDelivery(
      { ...totals, shipping: 0, total: 1180_00 },
      "express"
    )
    expect(t.total).toBe(1180_00 + EXPRESS_FEE)
  })
  it("COD limit is 50,000 rupees in paise", () => {
    expect(COD_MAX_TOTAL).toBe(5_000_000)
  })
})
