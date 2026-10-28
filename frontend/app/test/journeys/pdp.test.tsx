import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { productDetail } from "@/test/msw/db"
import { renderApp } from "@/test/render"

describe("journey 2: product page to cart", () => {
  it("pick a variant, change the quantity, add to cart: badge and drawer follow", async () => {
    const app = await renderApp({ route: `/p/${productDetail.slug}` })
    expect(
      await screen.findByRole("heading", { level: 1, name: productDetail.name })
    ).toBeInTheDocument()

    const badge = () => screen.getByRole("button", { name: /open cart/i })
    expect(badge()).toHaveAccessibleName("Open cart, 0 items")

    await app.user.click(await screen.findByRole("radio", { name: "Black" }))
    await app.user.click(screen.getByRole("radio", { name: "128 GB" }))
    await app.user.click(
      screen.getAllByRole("button", { name: /^Increase quantity/ })[0]!
    )
    await app.user.click(
      screen.getAllByRole("button", { name: "Add to cart" })[0]!
    )

    await waitFor(() =>
      expect(badge()).toHaveAccessibleName("Open cart, 1 item")
    )
    await app.user.click(badge())
    const drawer = await screen.findByRole("dialog", { name: "Your cart" })
    expect(
      await within(drawer).findByRole("link", { name: productDetail.name })
    ).toBeInTheDocument()
    expect(
      within(drawer).getByRole("textbox", {
        name: `Quantity of ${productDetail.name}`,
      })
    ).toHaveValue("2")
  })
})
