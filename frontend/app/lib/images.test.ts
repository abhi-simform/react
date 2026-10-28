import { describe, expect, it } from "vitest"

import { imageSources } from "./images"

describe("imageSources", () => {
  it("builds a width family for a resizable (picsum) URL, keeping the aspect ratio", () => {
    const s = imageSources(
      "https://picsum.photos/seed/shoe/800/800",
      [400, 200, 600]
    )
    expect(s.src).toBe("https://picsum.photos/seed/shoe/400/400") // the middle width
    expect(s.srcSet).toBe(
      "https://picsum.photos/seed/shoe/200/200 200w, https://picsum.photos/seed/shoe/400/400 400w, https://picsum.photos/seed/shoe/600/600 600w"
    )
    expect(s.webpSrcSet).toContain("/seed/shoe/400/400.webp 400w")
    expect([s.width, s.height]).toEqual([400, 400])
  })

  it("keeps a non-square ratio (1200x400 banner)", () => {
    const s = imageSources("https://picsum.photos/seed/b/1200/400", [600, 1200])
    expect(s.srcSet).toContain("/seed/b/600/200 600w")
    expect(s.height).toBe(Math.round(1200 / 3))
  })

  it("returns anything else unchanged, without a srcset", () => {
    expect(imageSources("/placeholder.svg", [200, 400])).toEqual({
      src: "/placeholder.svg",
    })
    expect(imageSources("http://localhost:4000/uploads/a.png", [200])).toEqual({
      src: "http://localhost:4000/uploads/a.png",
    })
    expect(imageSources("https://picsum.photos/seed/x/10/10", [])).toEqual({
      src: "https://picsum.photos/seed/x/10/10",
    })
  })
})
