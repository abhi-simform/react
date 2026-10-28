import { screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithProviders } from "@/test/render"

import { LoginForm } from "./LoginForm"

const home = { path: "/", element: <p>Home page</p> }

describe("LoginForm", () => {
  it("an empty submit shows both errors and focuses the first invalid field", async () => {
    const { user } = await renderWithProviders(<LoginForm />, {
      route: "/login",
      path: "/login",
      routes: [home],
    })
    await user.click(screen.getByRole("button", { name: "Log in" }))

    const email = screen.getByLabelText("Email")
    const password = screen.getByLabelText("Password")
    // an invalid email and an empty password: each field says why, programmatically
    expect(await screen.findAllByRole("alert")).not.toHaveLength(0)
    expect(email).toBeInvalid()
    expect(password).toBeInvalid()
    expect(email).toHaveAccessibleDescription(/valid email/i)
    expect(password).toHaveAccessibleDescription(/enter your password/i)
    expect(email).toHaveFocus()
  })

  it("wrong credentials show ONE generic message (no account enumeration)", async () => {
    const { user } = await renderWithProviders(<LoginForm />, {
      route: "/login",
      path: "/login",
      routes: [home],
    })
    await user.type(screen.getByLabelText("Email"), "customer@shopsphere.dev")
    await user.type(screen.getByLabelText("Password"), "WrongPass1")
    await user.click(screen.getByRole("button", { name: "Log in" }))
    expect(
      await screen.findByText("Incorrect email or password.")
    ).toBeInTheDocument()
  })

  it("a good login goes to the page the user came from", async () => {
    const app = await renderWithProviders(<LoginForm />, {
      route: "/login?from=/orders",
      path: "/login",
      routes: [home, { path: "/orders", element: <p>Orders page</p> }],
    })
    await app.user.type(
      screen.getByLabelText("Email"),
      "  Customer@ShopSphere.dev "
    )
    await app.user.type(screen.getByLabelText("Password"), "Password123")
    await app.user.click(screen.getByRole("button", { name: "Log in" }))
    expect(await screen.findByText("Orders page")).toBeInTheDocument()
    expect(app.location().pathname).toBe("/orders")
  })

  it("never redirects to an off-site `from`", async () => {
    const app = await renderWithProviders(<LoginForm />, {
      route: "/login?from=//evil.com",
      path: "/login",
      routes: [home],
    })
    await app.user.type(
      screen.getByLabelText("Email"),
      "customer@shopsphere.dev"
    )
    await app.user.type(screen.getByLabelText("Password"), "Password123")
    await app.user.click(screen.getByRole("button", { name: "Log in" }))
    await waitFor(() => expect(app.location().pathname).toBe("/"))
  })
})
