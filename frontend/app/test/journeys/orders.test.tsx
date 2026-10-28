import { screen, waitFor, within } from "@testing-library/react"
import { http } from "msw"
import { describe, expect, it } from "vitest"

import { db } from "@/test/msw/db"
import { API, fail } from "@/test/msw/handlers"
import { server } from "@/test/msw/server"
import { renderApp } from "@/test/render"

const id = () => db.orders[0]!.id as string

describe("journey 5: cancelling an order", () => {
  it("confirm dialog -> optimistic 'Cancelled' -> the server agrees", async () => {
    const app = await renderApp({ route: `/orders/${id()}`, signedIn: true })
    expect(
      await screen.findByRole("heading", {
        name: new RegExp(db.orders[0]!.orderNumber),
      })
    ).toBeInTheDocument()
    await app.user.click(
      await screen.findByRole("button", { name: "Cancel order" })
    )

    const dialog = await screen.findByRole("dialog", { name: /Cancel order/ })
    expect(
      within(dialog).getByRole("radio", { name: /./, checked: true })
    ).toBeInTheDocument() // a reason is preselected
    await app.user.click(
      within(dialog).getByRole("button", { name: /^(Yes, )?cancel order/i })
    )

    expect((await screen.findAllByText("Cancelled")).length).toBeGreaterThan(0)
    expect(await screen.findByText("Order cancelled")).toBeInTheDocument() // the toast
    await waitFor(() => expect(db.orders[0]!.status).toBe("cancelled"))
    expect(
      screen.queryByRole("button", { name: "Cancel order" })
    ).not.toBeInTheDocument()
  })

  it("a refusal (409: it was packed meanwhile) rolls the page back and explains", async () => {
    server.use(
      http.post(`${API}/orders/:id/cancel`, () =>
        fail(409, "INVALID_TRANSITION", "Cannot cancel")
      )
    )
    const app = await renderApp({ route: `/orders/${id()}`, signedIn: true })
    await app.user.click(
      await screen.findByRole("button", { name: "Cancel order" })
    )
    const dialog = await screen.findByRole("dialog", { name: /Cancel order/ })
    await app.user.click(
      within(dialog).getByRole("button", { name: /^(Yes, )?cancel order/i })
    )

    expect(
      await screen.findByText(
        "This order can no longer be cancelled: it is already on its way."
      )
    ).toBeInTheDocument()
    // rolled back: the order is still active and can be cancelled again
    expect(
      await screen.findByRole("button", { name: "Cancel order" })
    ).toBeInTheDocument()
    expect(db.orders[0]!.status).toBe("placed")
  })

  it("a network failure rolls back too, with a generic retry message", async () => {
    server.use(
      http.post(`${API}/orders/:id/cancel`, () => fail(500, "INTERNAL", "Boom"))
    )
    const app = await renderApp({ route: `/orders/${id()}`, signedIn: true })
    await app.user.click(
      await screen.findByRole("button", { name: "Cancel order" })
    )
    const dialog = await screen.findByRole("dialog", { name: /Cancel order/ })
    await app.user.click(
      within(dialog).getByRole("button", { name: /^(Yes, )?cancel order/i })
    )
    expect(
      await screen.findByText(
        "We could not cancel the order. Please try again."
      )
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("button", { name: "Cancel order" })
    ).toBeInTheDocument()
  })

  it("choosing 'Other' needs a few words before it can be sent", async () => {
    const app = await renderApp({ route: `/orders/${id()}`, signedIn: true })
    await app.user.click(
      await screen.findByRole("button", { name: "Cancel order" })
    )
    const dialog = await screen.findByRole("dialog", { name: /Cancel order/ })
    await app.user.click(within(dialog).getByRole("radio", { name: "Other" }))
    await app.user.click(
      within(dialog).getByRole("button", { name: /^(Yes, )?cancel order/i })
    )
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "at least 3 characters"
    )
    expect(within(dialog).getByLabelText("Tell us more")).toBeInvalid()
    expect(db.orders[0]!.status).toBe("placed")
  })
})
