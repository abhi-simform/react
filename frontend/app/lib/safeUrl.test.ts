import { describe, expect, it } from "vitest"

import { safeHref, safeImageSrc } from "./safeUrl"

describe("safeHref", () => {
  it.each(["https://shop.dev/a?b=1", "http://localhost:3000"])(
    "allows %s",
    (u) => {
      expect(safeHref(u)).toBeTruthy()
    }
  )
  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<script>",
    "vbscript:x",
    "file:///etc/passwd",
    "not a url",
    "",
    null,
    undefined,
    5,
    "https://x.com/" + "a".repeat(3000),
  ])("blocks %j", (u) => expect(safeHref(u)).toBeNull())
})
describe("safeImageSrc", () => {
  it("allows https and (in dev/test) http", () => {
    expect(safeImageSrc("https://cdn.x/a.png")).toBeTruthy()
    expect(safeImageSrc("data:image/png;base64,AAAA")).toBeNull()
    expect(safeImageSrc("javascript:1")).toBeNull()
  })
})
