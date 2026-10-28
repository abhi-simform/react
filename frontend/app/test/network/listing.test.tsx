import { screen, within } from "@testing-library/react"
import { http, HttpResponse, delay } from "msw"
import { describe, expect, it } from "vitest"

import { ProductListingPage } from "@/features/catalog"
import { fail } from "@/test/msw/handlers"
import { API } from "@/test/msw/handlers"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"

const render = (route = "/products") =>
  renderWithProviders(<ProductListingPage />, { route, path: "/products" })

describe("listing over the (fake) network", () => {
  it("shows a skeleton first, then the products", async () => {
    server.use(
      http.get(`${API}/products`, async () => {
        await delay(30)
        return undefined as never
      })
    )
    // `undefined as never` falls through to the default handler after the delay
    await render()
    const loading = screen
      .getAllByRole("status")
      .find((el) => el.getAttribute("aria-busy") === "true")!
    expect(loading).toHaveAttribute("aria-busy", "true")
    expect(loading).toHaveTextContent("Loading products")
    const cards = await screen.findAllByRole("article")
    expect(cards.length).toBeGreaterThan(0)
    expect(screen.queryByText("Loading products")).not.toBeInTheDocument()
  })

  it("an empty result shows the empty state with a way out", async () => {
    const app = await render("/products?search=zzzznothing&inStock=true")
    expect(
      await screen.findByText("No products match these filters")
    ).toBeInTheDocument()
    await app.user.click(
      screen.getByRole("button", { name: "Clear all filters" })
    )
    expect((await screen.findAllByRole("article")).length).toBeGreaterThan(0)
  })

  it("a 500 shows the error state; Retry succeeds the second time", async () => {
    let calls = 0
    server.use(
      http.get(`${API}/products`, () => {
        calls++
        return calls === 1 ? fail(500, "INTERNAL", "Boom") : undefined
      })
    )
    const app = await render()
    const alert = await screen.findByRole("alert")
    expect(
      within(alert).getByText("Something went wrong on our side")
    ).toBeInTheDocument()
    await app.user.click(within(alert).getByRole("button", { name: "Retry" }))
    expect((await screen.findAllByRole("article")).length).toBeGreaterThan(0)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it("a network failure says so (and offers retry)", async () => {
    server.use(
      http.get(`${API}/products`, () => HttpResponse.error(), { once: true })
    )
    await render()
    expect(
      await screen.findByText("Cannot reach the server")
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
  })

  it("a 422 (bad query) is a final answer: no retry button", async () => {
    server.use(
      http.get(`${API}/products`, () => fail(422, "VALIDATION_ERROR", "bad"))
    )
    await render()
    expect(
      await screen.findByText("Some details are not valid")
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Retry" })
    ).not.toBeInTheDocument()
  })
})
