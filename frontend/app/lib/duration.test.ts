import { describe, expect, it } from "vitest"

import { formatCountdown, splitDuration } from "./duration"

describe("splitDuration", () => {
  it.each([
    [0, { days: 0, hours: 0, minutes: 0, seconds: 0 }],
    [1, { days: 0, hours: 0, minutes: 0, seconds: 1 }], // rounds UP
    [1_000, { days: 0, hours: 0, minutes: 0, seconds: 1 }],
    [61_000, { days: 0, hours: 0, minutes: 1, seconds: 1 }],
    [86_400_000 + 3_661_000, { days: 1, hours: 1, minutes: 1, seconds: 1 }],
    [-5_000, { days: 0, hours: 0, minutes: 0, seconds: 0 }], // past: clamped
  ])("%i ms", (ms, expected) => {
    expect(splitDuration(ms)).toEqual(expected)
  })

  // Found by writing this test first: a bad `endsAt` gives NaN, which printed "NaN:NaN:NaN".
  it.each([NaN, Infinity, -Infinity])(
    "treats %s as 'over', not as NaN",
    (ms) => {
      const parts = splitDuration(ms)
      expect(Object.values(parts).every(Number.isFinite)).toBe(true)
      expect(formatCountdown(parts)).toBe("00:00:00")
    }
  )
})

describe("formatCountdown", () => {
  it.each([
    [{ days: 0, hours: 2, minutes: 14, seconds: 9 }, "02:14:09"],
    [{ days: 3, hours: 2, minutes: 14, seconds: 9 }, "3d 02:14:09"],
    [{ days: 0, hours: 0, minutes: 0, seconds: 0 }, "00:00:00"],
  ])("%j -> %s", (parts, expected) => {
    expect(formatCountdown(parts)).toBe(expected)
  })
})
