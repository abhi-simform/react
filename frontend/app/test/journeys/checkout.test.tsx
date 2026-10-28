import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import addresses from "@/test/fixtures/api/addresses.json"
import { renderApp } from "@/test/render"

describe("journey 3: a guest reaches checkout", () => {
  it("guest -> /checkout -> login (remembering where to go) -> lands in checkout", async () => {
    const app = await renderApp({ route: "/checkout" })

    // bounced to the login page, with the destination remembered in the URL
    expect(
      await screen.findByRole("heading", { name: "Log in" })
    ).toBeInTheDocument()
    expect(app.location().pathname).toBe("/login")
    expect(new URLSearchParams(app.location().search).get("from")).toBe(
      "/checkout"
    )

    await app.user.type(
      screen.getByLabelText("Email"),
      "customer@shopsphere.dev"
    )
    await app.user.type(screen.getByLabelText("Password"), "Password123")
    await app.user.click(screen.getByRole("button", { name: "Log in" }))

    expect(
      await screen.findByRole("heading", { name: "Delivery address" })
    ).toBeInTheDocument()
    expect(app.location().pathname).toBe("/checkout/address")
    // and Back must not return to the login form
    expect(
      screen.queryByRole("heading", { name: "Log in" })
    ).not.toBeInTheDocument()
  })
})

describe("journey 4: the multi-step checkout form", () => {
  it("validates each step, Back keeps what was entered, Review shows the choices", async () => {
    const app = await renderApp({ route: "/checkout", signedIn: true })
    await screen.findByRole("heading", { name: "Delivery address" })

    // step 1: Continue without choosing -> an error, focus stays on the step
    await app.user.click(
      screen.getByRole("button", { name: /continue to delivery/i })
    )
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choose a delivery address"
    )
    expect(app.location().pathname).toBe("/checkout/address")

    // choose the second address, continue
    const second = addresses.data[1]!
    await app.user.click(
      await screen.findByRole("radio", {
        name: new RegExp(second.line1.slice(0, 12)),
      })
    )
    await app.user.click(
      screen.getByRole("button", { name: /continue to delivery/i })
    )

    // step 2: no speed/slot yet -> errors
    expect(
      await screen.findByRole("heading", { name: "Delivery options" })
    ).toBeInTheDocument()
    await app.user.click(
      screen.getByRole("button", { name: /continue to payment/i })
    )
    expect(await screen.findAllByRole("alert")).not.toHaveLength(0)
    expect(app.location().pathname).toBe("/checkout/delivery")

    await app.user.click(screen.getByRole("radio", { name: /^Standard/ }))
    const slots = screen.getAllByRole("radio", { name: /^[A-Z][a-z]+day, / })
    await app.user.click(slots[0]!)
    await app.user.click(
      screen.getByRole("button", { name: /continue to payment/i })
    )

    // step 3: payment
    expect(
      await screen.findByRole("heading", { name: "Payment" })
    ).toBeInTheDocument()
    await app.user.click(
      screen.getByRole("button", { name: /continue to review/i })
    )
    expect(
      await screen.findByText("Choose a payment method")
    ).toBeInTheDocument()
    await app.user.click(screen.getByRole("radio", { name: /^Pay online/ }))

    // Back to delivery: the choices are still there
    await app.user.click(screen.getByRole("button", { name: "Back" }))
    expect(
      await screen.findByRole("heading", { name: "Delivery options" })
    ).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /^Standard/ })).toBeChecked()
    expect(
      screen.getAllByRole("radio", { name: /^[A-Z][a-z]+day, / })[0]
    ).toBeChecked()

    // forward again: payment kept too; then review
    await app.user.click(
      screen.getByRole("button", { name: /continue to payment/i })
    )
    expect(
      await screen.findByRole("radio", { name: /^Pay online/ })
    ).toBeChecked()
    await app.user.click(
      screen.getByRole("button", { name: /continue to review/i })
    )
    expect(
      await screen.findByRole("heading", { name: "Review order" })
    ).toBeInTheDocument()
    expect(screen.getByText(new RegExp(second.pincode))).toBeInTheDocument()
    await waitFor(() =>
      expect(
        within(screen.getByRole("main")).getByRole("button", {
          name: /place order/i,
        })
      ).toBeEnabled()
    )
  })
})
