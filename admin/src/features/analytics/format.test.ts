import { describe, expect, it } from "vitest"

import { formatDay, formatDelta, formatRupeesCompact } from "./format"

describe("analytics formatting", () => {
  it.each([
    [35, "+35%"],
    [-5.7, "-5.7%"],
    [0, "0%"],
    [null, "new"],
  ] as const)("delta %s -> %s", (pct, text) => {
    expect(formatDelta(pct)).toBe(text)
  })
  it("formats INR for axes (compact) in the Indian system", () => {
    expect(formatRupeesCompact(1_200_000)).toMatch(/12\s?L/) // 12 lakh
    expect(formatRupeesCompact(1500)).toMatch(/1\.5\s?K/)
  })
  it("does not shift an India calendar day a second time", () => {
    expect(formatDay("2026-10-31")).toBe("31 Oct")
    expect(formatDay("2026-01-01")).toBe("1 Jan")
  })
})
