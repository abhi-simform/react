import { screen, within } from "@testing-library/react"
import { http } from "msw"
import { describe, expect, it } from "vitest"

import { AddressBook } from "@/features/account/components/AddressBook"
import { CouponBox } from "@/features/cart/components/CouponBox"
import { API, fail } from "@/test/msw/handlers"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"

describe("address creation: a server validation error maps to the field", () => {
  it("shows the 422 message under 'House, street' and keeps the dialog open", async () => {
    server.use(
      http.post(`${API}/addresses`, () =>
        fail(422, "VALIDATION_ERROR", "Validation failed", [
          { path: "line1", message: "We could not find that street" },
        ])
      )
    )
    const { user } = await renderWithProviders(<AddressBook />, {
      signedIn: true,
    })
    await user.click(await screen.findByRole("button", { name: "Add address" }))
    const dialog = await screen.findByRole("dialog", { name: "Add address" })
    await user.type(within(dialog).getByLabelText("Full name"), "Asha Rao")
    await user.type(
      within(dialog).getByLabelText("Mobile number"),
      "9876543210"
    )
    await user.type(
      within(dialog).getByLabelText("House, street"),
      "12 Nowhere Lane"
    )
    await user.type(within(dialog).getByLabelText("City"), "Bengaluru")
    await user.type(within(dialog).getByLabelText("Pincode"), "560001")
    await user.click(within(dialog).getByRole("combobox", { name: "State" }))
    await user.click(await screen.findByRole("option", { name: "Karnataka" }))
    await within(dialog).findByText(/Delivery in/) // the pincode check finished
    await user.click(
      within(dialog).getByRole("button", { name: "Add address" })
    )

    expect(
      await within(dialog).findByText("We could not find that street")
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText("House, street")).toBeInvalid()
    expect(
      screen.getByRole("dialog", { name: "Add address" })
    ).toBeInTheDocument()
  })
})

describe("coupon box: every rejection is a sentence, never a code", () => {
  const apply = async (code: string) => {
    const app = await renderWithProviders(<CouponBox />, { signedIn: true })
    await app.user.type(await screen.findByLabelText("Coupon code"), code)
    await app.user.click(screen.getByRole("button", { name: "Apply" }))
    return app
  }
  it("unknown code", async () => {
    await apply("NOPE1")
    expect(
      await screen.findByText(/We do not recognise "NOPE1"/)
    ).toBeInTheDocument()
  })
  it("minimum order, with the amounts", async () => {
    await apply("BIGSPEND")
    expect(
      await screen.findByText(/needs a cart of at least/)
    ).toHaveTextContent("9,999")
  })
  it("a valid code is applied and shown", async () => {
    await apply("save10")
    expect(await screen.findByText(/SAVE10 applied/)).toBeInTheDocument()
  })
  it("a network failure gets the network sentence", async () => {
    server.use(http.post(`${API}/cart/coupon`, () => Response.error()))
    await apply("SAVE10")
    expect(
      await screen.findByText(/Cannot reach the server/)
    ).toBeInTheDocument()
  })
  it("client-side format errors never reach the server", async () => {
    let calls = 0
    server.use(
      http.post(`${API}/cart/coupon`, () => (calls++, fail(500, "X", "x")))
    )
    await apply("ab-cd")
    expect(
      await screen.findByText("Use letters and numbers only")
    ).toBeInTheDocument()
    expect(calls).toBe(0)
  })
})
