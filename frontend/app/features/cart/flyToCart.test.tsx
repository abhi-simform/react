import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const animate = vi.fn(() => ({ finished: Promise.resolve() }))
vi.mock("motion/mini", () => ({ animate }))

import { flyToCart } from "./flyToCart"

const rect = (left: number, top: number, size: number) =>
  ({
    left,
    top,
    width: size,
    height: size,
    right: left + size,
    bottom: top + size,
    x: left,
    y: top,
    toJSON() {},
  }) as DOMRect

function mountDom({ withTarget = true } = {}) {
  document.body.innerHTML = `
    <div data-fly-source><img src="https://picsum.photos/seed/a/200/200" /></div>
    ${withTarget ? "<button data-cart-target>Cart</button>" : ""}`
  const img = document.querySelector("img")!
  Object.defineProperty(img, "currentSrc", { value: img.src })
  vi.spyOn(img, "getBoundingClientRect").mockReturnValue(rect(100, 300, 200))
  if (withTarget)
    vi.spyOn(
      document.querySelector("[data-cart-target]")!,
      "getBoundingClientRect"
    ).mockReturnValue(rect(900, 10, 40))
  return document.querySelector("[data-fly-source]")!
}

function reducedMotion(reduce: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: reduce && query.includes("reduce"),
        media: query,
      }) as MediaQueryList
  )
}

describe("flyToCart (13.6)", () => {
  beforeEach(() => {
    animate.mockClear()
    reducedMotion(false)
  })
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("animates a clone from the image to the cart button, with transform + opacity only, then removes it", async () => {
    const source = mountDom()
    let finish!: () => void
    animate.mockImplementationOnce(() => ({
      finished: new Promise<void>((resolve) => (finish = resolve)),
    }))
    const done = flyToCart(source)
    await vi.waitFor(() => expect(animate).toHaveBeenCalled())
    expect(document.querySelector("img[data-fly]")).not.toBeNull()
    const [, keyframes] = animate.mock.calls[0] as unknown as [
      unknown,
      Record<string, unknown>,
    ]
    expect(Object.keys(keyframes).sort()).toEqual(["opacity", "transform"])
    finish()
    await done
    expect(document.querySelector("img[data-fly]")).toBeNull() // cleaned up
  })

  it("plays nothing when the user asked for reduced motion", async () => {
    reducedMotion(true)
    await flyToCart(mountDom())
    expect(animate).not.toHaveBeenCalled()
    expect(document.querySelector("img[data-fly]")).toBeNull()
  })

  it("plays nothing without a source or without a cart button", async () => {
    await flyToCart(null)
    await flyToCart(mountDom({ withTarget: false }))
    expect(animate).not.toHaveBeenCalled()
  })
})
