import { describe, expect, it } from "vitest"

import { couponFormSchema, describeCoupon, toCouponBody } from "./couponSchema"

const base = {
  code: "save10",
  description: "",
  type: "percent" as const,
  value: 10,
  minOrder: 0,
  firstOrderOnly: false,
  perUserLimit: 1,
  isActive: true,
}
const issues = (v: object) => {
  const r = couponFormSchema.safeParse({ ...base, ...v })
  return r.success
    ? {}
    : Object.fromEntries(
        r.error.issues.map((i) => [i.path.join("."), i.message])
      )
}

describe("couponFormSchema cross-field rules", () => {
  it("accepts a valid coupon and upper-cases the code", () => {
    const r = couponFormSchema.parse(base)
    expect(r.code).toBe("SAVE10")
  })
  it("the END DATE cannot precede the start date (error lands on endDay)", () => {
    expect(issues({ startDay: "2026-11-10", endDay: "2026-11-01" })).toEqual({
      endDay: "The end date cannot be before the start date",
    })
    expect(issues({ startDay: "2026-11-01", endDay: "2026-11-01" })).toEqual({}) // same day is fine
    expect(issues({ endDay: "2026-11-01" })).toEqual({}) // open start is fine
  })
  it("a percent coupon is at most 100; a flat one may exceed it", () => {
    expect(issues({ value: 101 })).toEqual({
      value: "A percent coupon is at most 100",
    })
    expect(issues({ type: "flat", value: 500 })).toEqual({})
  })
  it("a cap only applies to percent coupons", () => {
    expect(issues({ type: "flat", value: 50, maxDiscount: 20 })).toHaveProperty(
      "maxDiscount"
    )
    expect(issues({ maxDiscount: 200 })).toEqual({})
  })
  it("treats blank optional numbers as 'not set' and rejects non-integers", () => {
    expect(issues({ usageLimit: "", maxDiscount: Number.NaN })).toEqual({})
    expect(issues({ usageLimit: 2.5 })).toHaveProperty("usageLimit")
    expect(issues({ code: "no spaces" })).toHaveProperty("code")
  })
})

describe("toCouponBody and describeCoupon", () => {
  it("turns India days into instants and drops the cap for flat coupons", () => {
    const body = toCouponBody(
      couponFormSchema.parse({
        ...base,
        startDay: "2026-11-01",
        endDay: "2026-11-02",
      })
    )
    expect(body.startsAt).toBe("2026-10-31T18:30:00.000Z")
    expect(body.expiresAt).toBe("2026-11-02T18:29:59.999Z")
    expect(
      toCouponBody(couponFormSchema.parse({ ...base, type: "flat", value: 50 }))
        .maxDiscount
    ).toBeUndefined()
  })
  it("describes what the customer sees", () => {
    expect(
      describeCoupon({
        type: "percent",
        value: 10,
        maxDiscount: 200,
        minOrder: 500,
        firstOrderOnly: false,
      })
    ).toBe("10% off, up to ₹200 (orders from ₹500)")
    expect(
      describeCoupon({
        type: "flat",
        value: 100,
        minOrder: 0,
        firstOrderOnly: true,
      })
    ).toBe("₹100 off (first order only)")
  })
})
