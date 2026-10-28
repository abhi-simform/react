import { screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { renderWithProviders } from "@/test/render"
import cart from "@/test/fixtures/api/cart.json"

import { useCartUi } from "../cartUiStore"
import { CartDrawer } from "./CartDrawer"

const first = cart.data.items[0]!

// module-level client state: reset it so tests stay independent
beforeEach(() => useCartUi.setState({ drawerOpen: false, lineMessages: {} }))

async function openDrawer() {
  const app = await renderWithProviders(<CartDrawer />, { signedIn: true })
  const button = await screen.findByRole("button", { name: /open cart/i })
  await app.user.click(button)
  const dialog = await screen.findByRole("dialog", { name: "Your cart" })
  await within(dialog).findByRole("link", { name: first.name })
  return { ...app, dialog, button }
}

describe("CartDrawer (signed in, server cart)", () => {
  it("the cart button shows the item count and opens the drawer", async () => {
    const { user } = await renderWithProviders(<CartDrawer />, {
      signedIn: true,
    })
    const button = await screen.findByRole("button", {
      name: /open cart, \d+ items?/i,
    })
    await user.click(button)
    const dialog = await screen.findByRole("dialog", { name: "Your cart" })
    expect(
      await within(dialog).findByRole("link", { name: first.name })
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole("link", { name: "View cart" })
    ).toHaveAttribute("href", "/cart")
  })

  it("removing a line removes it and offers Undo, which brings it back", async () => {
    const { user } = await renderWithProviders(<CartDrawer />, {
      signedIn: true,
    })
    useCartUi.getState().setDrawerOpen(true)
    const dialog = await screen.findByRole("dialog", { name: "Your cart" })
    await within(dialog).findByRole("link", { name: first.name })

    await user.click(
      within(dialog).getByRole("button", { name: `Remove ${first.name}` })
    )
    await vi.waitFor(() =>
      expect(
        within(dialog).queryByRole("link", { name: first.name })
      ).not.toBeInTheDocument()
    )

    const undo = await screen.findByRole("button", { name: "Undo" })
    await user.click(undo)
    expect(
      await within(dialog).findByRole("link", { name: first.name })
    ).toBeInTheDocument()
  })

  it("changing the quantity updates the subtotal", async () => {
    const { user } = await renderWithProviders(<CartDrawer />, {
      signedIn: true,
    })
    useCartUi.getState().setDrawerOpen(true)
    const dialog = await screen.findByRole("dialog", { name: "Your cart" })
    const subtotal = async () =>
      (await within(dialog).findByText("Subtotal")).parentElement!.textContent
    await within(dialog).findByRole("link", { name: first.name })
    const before = await subtotal()
    await user.click(
      within(dialog).getAllByRole("button", {
        name: /^Increase quantity of /,
      })[0]!
    )
    await vi.waitFor(async () => expect(await subtotal()).not.toBe(before))
  })

  it("Escape closes the drawer and focus returns to the cart button", async () => {
    const { user } = await renderWithProviders(<CartDrawer />, {
      signedIn: true,
    })
    const button = await screen.findByRole("button", { name: /open cart/i })
    await user.click(button)
    await screen.findByRole("dialog", { name: "Your cart" })
    await user.keyboard("{Escape}")
    await vi.waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    expect(button).toHaveFocus()
  })
})
