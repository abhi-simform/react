import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { productsFixture } from "@/test/fixtures/products"
import { renderWithProviders } from "@/test/render"

import { toProductCardVM } from "../mappers"
import { VirtualProductGrid } from "./VirtualProductGrid"

const many = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const vm = toProductCardVM(productsFixture[i % productsFixture.length]!)
    return { ...vm, id: `p-${i}`, slug: `p-${i}`, name: `Product ${i}` }
  })

// jsdom has no layout: every element measures 0 px, so every row would "fit". TanStack Virtual reads
// `offsetHeight`, so give rows a real height.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(380)
})

describe("VirtualProductGrid (13.4)", () => {
  it("renders only the rows near the viewport, but tells assistive tech the real size", async () => {
    await renderWithProviders(<VirtualProductGrid products={many(400)} />)
    const items = screen.getAllByRole("listitem")
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThan(60) // not 400
    for (const item of items)
      expect(item).toHaveAttribute("aria-setsize", "400")
    expect(items[0]).toHaveAttribute("aria-posinset", "1")
    expect(screen.getByRole("list", { name: "Products" })).toBeInTheDocument()
  })

  it("a short list renders completely (nothing to virtualise)", async () => {
    await renderWithProviders(<VirtualProductGrid products={many(4)} />)
    expect(screen.getAllByRole("listitem")).toHaveLength(4)
  })
})
