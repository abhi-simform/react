import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { paths } from "@/lib/paths"
import { productsFixture } from "@/test/fixtures/products"
import { renderWithProviders } from "@/test/render"

import { toProductCardVM } from "../mappers"
import { ProductCard } from "./ProductCard"

const vm = (over: Partial<(typeof productsFixture)[number]> = {}) =>
  toProductCardVM({ ...productsFixture[0]!, ...over })

describe("ProductCard", () => {
  it("links the title to the product page and shows the price", async () => {
    await renderWithProviders(<ProductCard product={vm()} />)
    const link = screen.getByRole("link", { name: productsFixture[0]!.name })
    expect(link).toHaveAttribute(
      "href",
      paths.product(productsFixture[0]!.slug)
    )
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeEnabled()
  })

  it("add to cart reports the product", async () => {
    const onAddToCart = vi.fn()
    const { user } = await renderWithProviders(
      <ProductCard product={vm({ stock: 10 })} onAddToCart={onAddToCart} />
    )
    await user.click(screen.getByRole("button", { name: "Add to cart" }))
    expect(onAddToCart).toHaveBeenCalledOnce()
  })

  it("out of stock: Notify me instead of Add to cart", async () => {
    const onNotifyMe = vi.fn()
    const { user } = await renderWithProviders(
      <ProductCard product={vm({ stock: 0 })} onNotifyMe={onNotifyMe} />
    )
    expect(
      screen.queryByRole("button", { name: "Add to cart" })
    ).not.toBeInTheDocument()
    expect(screen.getByText("Out of stock")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Notify me" }))
    expect(onNotifyMe).toHaveBeenCalledOnce()
  })

  it("the add button can be disabled (an ended flash sale)", async () => {
    await renderWithProviders(
      <ProductCard product={vm({ stock: 5 })} addToCartDisabled />
    )
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeDisabled()
  })

  it("has a wishlist button with an accessible name", async () => {
    await renderWithProviders(<ProductCard product={vm()} />)
    expect(
      await screen.findByRole("button", { name: /wishlist/i })
    ).toBeInTheDocument()
  })

  it("says so when nobody rated it", async () => {
    await renderWithProviders(
      <ProductCard product={vm({ ratingCount: 0, ratingAvg: 0 })} />
    )
    expect(screen.getByText("No ratings yet")).toBeInTheDocument()
  })
})
