import type { Metric } from "web-vitals"
import { describe, expect, it } from "vitest"

import { toVitalsPayload } from "./vitals"

const metric = (over: Partial<Metric>): Metric =>
  ({
    name: "LCP",
    value: 2412.6,
    rating: "good",
    navigationType: "navigate",
    ...over,
  }) as Metric

describe("toVitalsPayload", () => {
  it("rounds milliseconds, keeps the path and connection type, never the query", () => {
    expect(
      toVitalsPayload(metric({}), {
        pathname: "/products",
        connection: "4g",
        mobile: true,
      })
    ).toEqual({
      name: "LCP",
      value: 2413,
      rating: "good",
      path: "/products",
      connection: "4g",
      nav: "navigate",
      ua: "mobile",
    })
  })

  it("keeps CLS as a 4-decimal score, not milliseconds", () => {
    const p = toVitalsPayload(metric({ name: "CLS", value: 0.123456 }), {
      pathname: "/",
      mobile: false,
    })
    expect(p.value).toBe(0.1235)
    expect(p.ua).toBe("desktop")
  })
})
