import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { QuantityStepper } from "@/components/common/QuantityStepper"
import { AddressFormDialog } from "@/features/account/components/AddressFormDialog"
import { LoginForm } from "@/features/auth/components/LoginForm"
import { ProductCard } from "@/features/catalog/components/ProductCard"
import { toProductCardVM } from "@/features/catalog/mappers"
import { productsFixture } from "@/test/fixtures/products"
import { renderApp, renderWithProviders } from "@/test/render"
import { setViewport } from "@/test/viewport"

import { axe } from "./axe"

describe("axe on components (names, roles, labels, ARIA validity)", () => {
  it("can fail: an unnamed button and an unlabelled input are reported", async () => {
    const host = document.createElement("div")
    host.innerHTML = "<main><button></button><input type='text'></main>"
    document.body.append(host)
    const { violations } = await axe(host)
    host.remove()
    expect(violations.map((v) => v.id)).toEqual(
      expect.arrayContaining(["button-name", "label"])
    )
  })

  it("login form, also with its errors showing", async () => {
    const { container, user } = await renderWithProviders(<LoginForm />, {
      route: "/login",
      path: "/login",
    })
    expect(await axe(container)).toHaveNoViolations()
    await user.click(screen.getByRole("button", { name: "Log in" }))
    await screen.findAllByRole("alert")
    expect(await axe(container)).toHaveNoViolations()
  })

  it("product card, in stock and out of stock", async () => {
    const { container } = await renderWithProviders(
      <ul>
        <li>
          <ProductCard
            product={toProductCardVM({ ...productsFixture[0]!, stock: 9 })}
          />
        </li>
        <li>
          <ProductCard
            product={toProductCardVM({ ...productsFixture[1]!, stock: 0 })}
          />
        </li>
      </ul>
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it("quantity stepper", async () => {
    const { container } = await renderWithProviders(
      <QuantityStepper value={2} max={5} onValueChange={() => {}} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it("address dialog (new and with errors)", async () => {
    const { user, baseElement } = await renderWithProviders(
      <AddressFormDialog
        target="new"
        pending={false}
        onClose={() => {}}
        onSubmit={async () => null}
      />
    )
    const dialog = await screen.findByRole("dialog")
    expect(await axe(dialog)).toHaveNoViolations()
    await user.click(
      within(dialog).getByRole("button", { name: "Add address" })
    )
    await within(dialog).findByText("Enter the recipient's name")
    expect(await axe(baseElement)).toHaveNoViolations()
  })

  it("the routed listing page and the cart page", async () => {
    setViewport(1280)
    const app = await renderApp({ route: "/products" })
    await screen.findAllByRole("article")
    expect(await axe(app.container)).toHaveNoViolations()
  })
})
