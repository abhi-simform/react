import { describe, expect, it } from "vitest"

import { scaleBars } from "./components/SpendingChart"

describe("scaleBars", () => {
  it("scales to the tallest bar", () => {
    expect(scaleBars([0, 50, 100])).toEqual([0, 50, 100])
    expect(scaleBars([1, 3])).toEqual([33, 100])
  })
  it("keeps an all-zero or empty series flat", () => {
    expect(scaleBars([0, 0, 0])).toEqual([0, 0, 0])
    expect(scaleBars([])).toEqual([])
  })
})
