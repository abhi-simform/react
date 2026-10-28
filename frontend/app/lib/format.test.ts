import { describe, expect, it } from "vitest"

import {
  formatCount,
  formatCurrency,
  formatDate,
  formatRelative,
  formatRupees,
  toPriceVM,
} from "./format"

// Intl output has non-breaking spaces in some locales: compare on normalised text.
const flat = (s: string) => s.replace(/ /g, " ")

describe("formatCurrency (integer paise -> text)", () => {
  it.each([
    [0, "₹0.00"],
    [1, "₹0.01"],
    [99, "₹0.99"],
    [49_900, "₹499.00"],
    [123_456_78, "₹1,23,456.78"], // Indian digit grouping
    [-2_500, "-₹25.00"],
  ])("%i paise -> %s", (paise, expected) => {
    expect(flat(formatCurrency(paise))).toBe(expected)
  })

  it("takes the currency and locale as parameters", () => {
    expect(flat(formatCurrency(150_000, "USD", "en-US"))).toBe("$1,500.00")
  })
})

describe("formatRupees (whole rupees from the API)", () => {
  it("has no decimals and groups lakhs", () => {
    expect(flat(formatRupees(59_999))).toBe("₹59,999")
    expect(flat(formatRupees(1_250_000))).toBe("₹12,50,000")
  })
})

describe("formatDate", () => {
  it("formats an ISO string and a Date the same way", () => {
    expect(formatDate("2026-10-12T10:00:00Z")).toBe("12 Oct 2026")
    expect(formatDate(new Date(2026, 9, 12))).toBe("12 Oct 2026")
  })
  it.each(["", "not a date", "2026-13-45"])(
    "returns an empty string for %j, never 'Invalid Date'",
    (bad) => {
      expect(formatDate(bad)).toBe("")
    }
  )
})

describe("formatRelative", () => {
  const now = new Date("2026-10-28T12:00:00Z")
  const ago = (ms: number) => new Date(now.getTime() - ms)
  const MIN = 60_000
  const HOUR = 60 * MIN
  const DAY = 24 * HOUR

  it.each([
    [10_000, "10 seconds ago"],
    [5 * MIN, "5 minutes ago"],
    [3 * HOUR, "3 hours ago"],
    [DAY, "yesterday"],
    [3 * DAY, "3 days ago"],
    [14 * DAY, "2 weeks ago"],
    [60 * DAY, "2 months ago"],
    [400 * DAY, "last year"],
  ])("%i ms in the past -> %s", (ms, expected) => {
    expect(formatRelative(ago(ms), { now })).toBe(expected)
  })

  it("handles the future", () => {
    expect(formatRelative(new Date(now.getTime() + 2 * HOUR), { now })).toBe(
      "in 2 hours"
    )
  })
  it("returns '' for an invalid date", () => {
    expect(formatRelative("nope", { now })).toBe("")
  })
})

describe("formatCount", () => {
  it.each([
    [999, "999"],
    [1_234, "1.2K"],
    [100_000, "1L"], // lakh, en-IN
  ])("%i -> %s", (n, expected) => {
    expect(formatCount(n)).toBe(expected)
  })
})

describe("toPriceVM", () => {
  it("computes the discount once, at the boundary", () => {
    const vm = toPriceVM(59_999, 79_999)
    expect(flat(vm.current)).toBe("₹59,999")
    expect(flat(vm.mrp ?? "")).toBe("₹79,999")
    expect(vm.discountPercent).toBe(25)
    expect(vm.discountLabel).toBe("25% off")
  })
  it.each([
    ["no mrp", 100, undefined],
    ["mrp equal to price", 100, 100],
    ["mrp lower than price", 100, 80],
  ])("%s -> no discount", (_name, price, mrp) => {
    const vm = toPriceVM(price, mrp)
    expect(vm.mrp).toBeNull()
    expect(vm.discountLabel).toBeNull()
    expect(vm.discountPercent).toBe(0)
  })
})
