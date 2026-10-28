import { describe, expect, it } from "vitest"

import { canonicalUrl, noindexMeta, pageMeta } from "./seo"

describe("canonicalUrl", () => {
  it("drops tracking parameters and every parameter not on the keep list", () => {
    expect(
      canonicalUrl(
        "/products",
        "?utm_source=mail&gclid=1&brand=Apple&sort=price_asc"
      )
    ).toBe("http://localhost:5173/products")
  })
  it("keeps allowed parameters in a stable order, without tracking ones", () => {
    expect(
      canonicalUrl("/c/phones", "?utm_campaign=x&page=2&brand=A", [
        "page",
        "brand",
      ])
    ).toBe("http://localhost:5173/c/phones?brand=A&page=2")
  })
  it("normalises the trailing slash and keeps the root", () => {
    expect(canonicalUrl("/p/phone/")).toBe("http://localhost:5173/p/phone")
    expect(canonicalUrl("/")).toBe("http://localhost:5173/")
  })
})

describe("pageMeta", () => {
  const base = { description: "d", canonical: "http://x/p" }
  const get = (tags: Record<string, unknown>[], key: string, value: string) =>
    tags.find((t) => t[key] === value)

  it("emits title, description, canonical, Open Graph and a Twitter card", () => {
    const tags = pageMeta({
      ...base,
      title: "Phone",
      image: "http://x/i.jpg",
      type: "product",
    })
    expect(get(tags, "title", "Phone | ShopSphere")).toBeTruthy()
    expect(get(tags, "name", "description")).toMatchObject({ content: "d" })
    expect(get(tags, "rel", "canonical")).toMatchObject({
      tagName: "link",
      href: "http://x/p",
    })
    expect(get(tags, "property", "og:type")).toMatchObject({
      content: "product",
    })
    expect(get(tags, "property", "og:image")).toMatchObject({
      content: "http://x/i.jpg",
    })
    expect(get(tags, "name", "twitter:card")).toMatchObject({
      content: "summary_large_image",
    })
    expect(get(tags, "name", "robots")).toBeUndefined()
  })
  it("falls back to a small card without an image and adds robots only when asked", () => {
    const tags = pageMeta({ ...base, noindex: true })
    expect(get(tags, "name", "twitter:card")).toMatchObject({
      content: "summary",
    })
    expect(get(tags, "name", "robots")).toMatchObject({
      content: "noindex, nofollow",
    })
    expect(get(tags, "property", "og:image")).toBeUndefined()
  })
  it("carries JSON-LD blocks as script descriptors", () => {
    const tags = pageMeta({ ...base, jsonLd: [{ "@type": "WebSite" }] })
    expect(
      tags.some(
        (t) => JSON.stringify(t["script:ld+json"]) === '{"@type":"WebSite"}'
      )
    ).toBe(true)
  })
  it("noindexMeta is a title and a robots tag, nothing a crawler could index", () => {
    expect(noindexMeta("Cart")).toEqual([
      { title: "Cart | ShopSphere" },
      { name: "robots", content: "noindex, nofollow" },
    ])
  })
})
