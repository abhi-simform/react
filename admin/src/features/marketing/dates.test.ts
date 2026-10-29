import { describe, expect, it } from "vitest"

import {
  findDealOverlap,
  fromIstLocal,
  istDayEnd,
  istDayStart,
  overlaps,
  toIstDay,
  toIstLocal,
} from "./dates"

describe("India-time helpers (independent of the machine's time zone)", () => {
  it("a calendar day starts and ends at IST midnight", () => {
    expect(istDayStart("2026-11-01").toISOString()).toBe(
      "2026-10-31T18:30:00.000Z"
    )
    expect(istDayEnd("2026-11-01").toISOString()).toBe(
      "2026-11-01T18:29:59.999Z"
    )
  })
  it("round-trips instants to IST days and wall-clock times", () => {
    expect(toIstDay("2026-10-31T18:30:00.000Z")).toBe("2026-11-01") // 00:00 IST is already tomorrow in IST
    expect(toIstDay("2026-11-01T18:29:59.999Z")).toBe("2026-11-01")
    expect(toIstLocal("2026-11-01T06:00:00.000Z")).toBe("2026-11-01T11:30")
    expect(fromIstLocal("2026-11-01T11:30").toISOString()).toBe(
      "2026-11-01T06:00:00.000Z"
    )
  })
})

const w = (a: string, b: string) => ({
  startsAt: new Date(a),
  endsAt: new Date(b),
})
describe("overlaps (half-open windows)", () => {
  it.each([
    [
      "2026-01-01T10:00Z",
      "2026-01-01T12:00Z",
      "2026-01-01T11:00Z",
      "2026-01-01T13:00Z",
      true,
    ],
    [
      "2026-01-01T10:00Z",
      "2026-01-01T12:00Z",
      "2026-01-01T12:00Z",
      "2026-01-01T13:00Z",
      false,
    ], // touching
    [
      "2026-01-01T10:00Z",
      "2026-01-01T12:00Z",
      "2026-01-01T09:00Z",
      "2026-01-01T10:00Z",
      false,
    ],
    [
      "2026-01-01T10:00Z",
      "2026-01-01T18:00Z",
      "2026-01-01T11:00Z",
      "2026-01-01T12:00Z",
      true,
    ], // contained
  ] as const)("%s..%s vs %s..%s = %s", (a, b, c, d, expected) => {
    expect(overlaps(w(a, b), w(c, d))).toBe(expected)
  })
})

describe("findDealOverlap", () => {
  const deals = [
    {
      id: "d1",
      productId: "p1",
      startsAt: "2026-01-01T10:00:00Z",
      endsAt: "2026-01-01T12:00:00Z",
      isActive: true,
    },
    {
      id: "d2",
      productId: "p1",
      startsAt: "2026-01-02T10:00:00Z",
      endsAt: "2026-01-02T12:00:00Z",
      isActive: false,
    },
    {
      id: "d3",
      productId: "p2",
      startsAt: "2026-01-01T10:00:00Z",
      endsAt: "2026-01-01T12:00:00Z",
      isActive: true,
    },
  ]
  const win = w("2026-01-01T11:00Z", "2026-01-01T13:00Z")
  it("finds an active deal on the SAME product only", () => {
    expect(findDealOverlap(deals, "p1", win)?.id).toBe("d1")
    expect(findDealOverlap(deals, "p3", win)).toBeUndefined()
  })
  it("ignores inactive deals and the deal being edited", () => {
    expect(
      findDealOverlap(deals, "p1", w("2026-01-02T10:00Z", "2026-01-02T11:00Z"))
    ).toBeUndefined()
    expect(findDealOverlap(deals, "p1", win, "d1")).toBeUndefined()
  })
})
