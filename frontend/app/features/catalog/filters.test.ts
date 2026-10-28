import { describe, expect, it } from "vitest"

import {
  BUILT_IN_DEFAULTS,
  countActiveFilters,
  parseFilters,
  toProductQuery,
  toSearchParams,
} from "./filters"

const parse = (qs: string) => parseFilters(new URLSearchParams(qs))

describe("parseFilters: the URL is user input, garbage never throws", () => {
  it("empty URL = defaults", () => {
    expect(parse("")).toEqual({
      search: undefined,
      brands: [],
      minPrice: undefined,
      maxPrice: undefined,
      minRating: undefined,
      inStock: false,
      sort: "relevance",
      page: 1,
      view: "grid",
      mode: "pages",
    })
  })
  it.each([
    ["page=abc", "page", 1],
    ["page=-4", "page", 1],
    ["page=2.5", "page", 1],
    ["page=999999", "page", 1],
    ["page=3", "page", 3],
    ["sort=hax", "sort", "relevance"],
    ["sort=price_asc", "sort", "price_asc"],
    ["view=cube", "view", "grid"],
    ["mode=infinite", "mode", "pages"],
    ["inStock=yes", "inStock", false],
    ["inStock=true", "inStock", true],
    ["minPrice=", "minPrice", undefined],
    ["minPrice=abc", "minPrice", undefined],
    ["minPrice=-5", "minPrice", undefined],
    ["minRating=9", "minRating", undefined],
    ["minRating=4", "minRating", 4],
    ["search=%20%20", "search", undefined],
  ])("%s -> %s", (qs, key, expected) => {
    expect(parse(qs)[key as keyof ReturnType<typeof parse>]).toEqual(expected)
  })
  it("repairs a reversed price range", () => {
    const f = parse("minPrice=900&maxPrice=100")
    expect([f.minPrice, f.maxPrice]).toEqual([100, 900])
  })
  it("de-duplicates brands and caps the list", () => {
    expect(parse("brand=A&brand=A&brand=B").brands).toEqual(["A", "B"])
    const many = Array.from({ length: 40 }, (_, i) => `brand=B${i}`).join("&")
    expect(parse(many).brands).toHaveLength(20)
  })
  it("survives control characters and huge input", () => {
    expect(() =>
      parse("search=" + "x".repeat(10_000) + "&brand=%00%FF")
    ).not.toThrow()
    expect(parse("search=" + "x".repeat(10_000)).search).toBeUndefined()
  })
})

describe("toSearchParams round trip", () => {
  it("omits defaults", () => {
    expect(toSearchParams(parse("")).toString()).toBe("")
  })
  it.each([
    "search=phone&brand=Apple&brand=boAt&minPrice=100&maxPrice=900&minRating=4&inStock=true&sort=price_desc&page=2&view=list&mode=more",
    "brand=Samsung",
    "sort=rating",
  ])("parse(serialise(parse(x))) is stable for %s", (qs) => {
    const once = parse(qs)
    expect(parse(toSearchParams(once).toString())).toEqual(once)
  })
  it("respects custom defaults", () => {
    const defaults = { ...BUILT_IN_DEFAULTS, sort: "rating" as const }
    const f = parseFilters(new URLSearchParams(""), defaults)
    expect(f.sort).toBe("rating")
    expect(toSearchParams(f, defaults).toString()).toBe("")
  })
})

describe("countActiveFilters / toProductQuery", () => {
  it("sort, page and view do not count; a price range counts once", () => {
    expect(countActiveFilters(parse("sort=rating&page=2&view=list"))).toBe(0)
    expect(
      countActiveFilters(
        parse("minPrice=1&maxPrice=9&brand=A&brand=B&inStock=true")
      )
    ).toBe(4)
  })
  it("builds the API query", () => {
    const q = toProductQuery(parse("brand=A&brand=B&search=x&page=2"), "phones")
    expect(q).toMatchObject({ category: "phones", page: 2 })
    expect(JSON.stringify(q)).toContain("A")
  })
})
