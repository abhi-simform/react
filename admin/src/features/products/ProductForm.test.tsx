import { act, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it } from "vitest"

import { API, fail, ok, server } from "@/test/server"
import { renderWithRouter } from "@/test/render"
import { ProductForm } from "./ProductForm"
import { emptyProduct, type ProductFormValues } from "./schema"

// A valid product to start from, so each test changes only the thing it is about.
const valid: ProductFormValues = {
  ...emptyProduct,
  name: "Nova Phone",
  brand: "Nova",
  categoryId: "cat1",
  price: 900,
  mrp: 1000,
  stock: 5,
  sku: "NOVA-1",
  status: "active",
}

beforeEach(() => {
  server.use(
    http.get(`${API}/categories`, () =>
      HttpResponse.json(
        ok([{ id: "cat1", name: "Phones", slug: "phones", children: [] }])
      )
    ),
    http.get(`${API}/brands`, () =>
      HttpResponse.json(ok([{ name: "Nova", count: 3 }]))
    )
  )
})

const openTab = (name: RegExp) =>
  userEvent.click(screen.getByRole("tab", { name }))
const submit = () =>
  userEvent.click(screen.getByRole("button", { name: "Create product" }))

describe("<ProductForm>", () => {
  it("rejects a fractional price in the form, before any request (money is whole rupees)", async () => {
    let requests = 0
    server.use(
      http.post(
        `${API}/seller/products`,
        () => (requests++, HttpResponse.json(ok({ _id: "x" })))
      )
    )
    await renderWithRouter(<ProductForm defaults={valid} />)
    await openTab(/pricing/i)
    const price = screen.getByLabelText("Selling price (₹)")
    await userEvent.clear(price)
    await userEvent.type(price, "99.5")
    await submit()
    expect(await screen.findByText("Whole rupees only")).toBeInTheDocument()
    expect(requests).toBe(0)
  })

  it("keeps price <= MRP (cross-field rule) on the price input", async () => {
    await renderWithRouter(<ProductForm defaults={{ ...valid, price: 1500 }} />)
    await submit()
    expect(
      await screen.findByText("Price cannot be higher than the MRP")
    ).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /pricing/i })).toHaveTextContent(
      "(!)"
    )
  })

  it("puts the API's nested 422 message under the right input and jumps to that tab", async () => {
    server.use(
      http.post(`${API}/seller/products`, () =>
        HttpResponse.json(
          fail("VALIDATION_ERROR", "Validation failed", [
            {
              in: "body",
              path: "variants.0.sku",
              message: "Each variant needs its own SKU",
            },
          ]),
          { status: 422 }
        )
      )
    )
    await renderWithRouter(
      <ProductForm
        defaults={{
          ...valid,
          variants: [
            { sku: "NOVA-1-S", color: "", size: "S", price: 900, stock: 2 },
          ],
        }}
      />
    )
    await submit()
    const msg = await screen.findByText("Each variant needs its own SKU")
    expect(msg).toBeVisible() // the form switched to the Variants tab, where the input lives
    const input = screen.getByLabelText("SKU", { selector: "#variants-0-sku" })
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(input).toHaveAccessibleDescription("Each variant needs its own SKU")
    expect(screen.getByText(/server rejected some fields/i)).toBeInTheDocument()
  })

  it("maps a duplicate-SKU 409 onto the SKU input", async () => {
    server.use(
      http.post(`${API}/seller/products`, () =>
        HttpResponse.json(
          fail("SKU_TAKEN", "That SKU is already used", [
            {
              in: "body",
              path: "sku",
              message: "That SKU is already used by another product",
            },
          ]),
          { status: 409 }
        )
      )
    )
    await renderWithRouter(<ProductForm defaults={valid} />)
    await submit()
    expect(
      await screen.findByText("That SKU is already used by another product")
    ).toBeInTheDocument()
  })

  it("asks before leaving with unsaved edits, and a successful save navigates without asking", async () => {
    server.use(
      http.post(`${API}/seller/products`, () =>
        HttpResponse.json(ok({ _id: "p9" }), { status: 201 })
      )
    )
    const { router } = await renderWithRouter(<ProductForm defaults={valid} />)
    await userEvent.type(screen.getByLabelText("Name"), " Pro")
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument()

    // Not awaited: a blocked navigation stays pending until the user decides.
    act(() => void router.navigate({ to: "/elsewhere" } as never))
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent("Leave without saving?")
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Keep editing" })
    )
    expect(screen.getByLabelText("Name")).toBeInTheDocument() // still on the form
    expect(screen.queryByText("Elsewhere")).not.toBeInTheDocument()

    // Save: success clears the dirty state, so the post-save navigation to the edit page is not blocked.
    await submit()
    expect(await screen.findByText("Product page")).toBeInTheDocument()
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })
})
