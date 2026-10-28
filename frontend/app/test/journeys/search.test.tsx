import { screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { renderApp } from "@/test/render"
import { setViewport } from "@/test/viewport"

const params = (app: { location: () => { search: string } }) =>
  new URLSearchParams(app.location().search)

describe("journey 1: search, filter, sort", () => {
  beforeEach(() => setViewport(1280)) // the desktop layout: the filter sidebar is on the page

  it("search -> brand -> price -> sort: URL, results and chips agree, and chips undo", async () => {
    const app = await renderApp({ route: "/products" })

    // search from the header box
    await app.user.type(
      await screen.findByRole("combobox", { name: /search/i }),
      "phone{Enter}"
    )
    expect(
      await screen.findByRole("heading", { name: 'Results for "phone"' })
    ).toBeInTheDocument()
    expect(params(app).get("search")).toBe("phone")
    const initial = await screen.findAllByRole("article")
    expect(initial.length).toBeGreaterThan(1)

    // brand facet: pick the first brand the sidebar offers
    const brandGroup = await screen.findByRole("group", { name: "Brand" })
    const brandBox = (await within(brandGroup).findAllByRole("checkbox"))[0]!
    const brand = brandBox
      .closest("label")!
      .textContent!.replace(/\d+$/, "")
      .trim()
    await app.user.click(brandBox)
    await waitFor(() => expect(params(app).getAll("brand")).toEqual([brand]))
    const chips = screen.getByRole("list", { name: "Active filters" })
    expect(
      within(chips).getByRole("button", {
        name: `Remove filter Brand: ${brand}`,
      })
    ).toBeInTheDocument()
    await waitFor(async () => {
      const cards = await screen.findAllByRole("article")
      expect(cards.length).toBeLessThanOrEqual(initial.length)
      for (const card of cards)
        expect(within(card).getByText(brand)).toBeInTheDocument()
    })

    // price: typing commits to the URL after the pause
    await app.user.type(screen.getByLabelText("Minimum price"), "1")
    await waitFor(() => expect(params(app).get("minPrice")).toBe("1"), {
      timeout: 2000,
    })
    expect(
      await within(chips).findByRole("button", {
        name: /Remove filter Price: From/,
      })
    ).toBeInTheDocument()

    // sort
    await app.user.selectOptions(screen.getByLabelText("Sort by"), "price_asc")
    await waitFor(() => expect(params(app).get("sort")).toBe("price_asc"))
    await waitFor(async () => {
      const prices = (await screen.findAllByRole("article")).map((c) =>
        Number(
          within(c).getAllByText(/^₹/)[0]!.textContent!.replace(/[^\d]/g, "")
        )
      )
      expect(prices).toEqual([...prices].sort((a, b) => a - b))
    })

    // removing the brand chip updates URL and results; search stays
    await app.user.click(
      screen.getByRole("button", { name: `Remove filter Brand: ${brand}` })
    )
    await waitFor(() => expect(params(app).has("brand")).toBe(false))
    expect(params(app).get("search")).toBe("phone")
  })

  it("a shared URL restores every filter (URL is the only store)", async () => {
    const app = await renderApp({
      route: "/products?search=phone&sort=price_desc&inStock=true&minRating=3",
    })
    expect(
      await screen.findByRole("heading", { name: 'Results for "phone"' })
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Sort by")).toHaveValue("price_desc")
    expect(
      screen.getByRole("checkbox", { name: /in stock only/i })
    ).toBeChecked()
    expect(screen.getByRole("radio", { name: /3 stars/i })).toBeChecked()
    expect(app.location().search).toContain("inStock=true")
  })
})
