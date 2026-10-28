import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithProviders } from "@/test/render"
import { listProducts } from "@/test/msw/db"

import { useProductFilters } from "../hooks/useProductFilters"
import { FilterSidebar } from "./FilterSidebar"

function Sidebar() {
  const api = useProductFilters()
  const { meta } = listProducts(new URLSearchParams())
  return <FilterSidebar api={api} facets={meta.facets} />
}

const brand = listProducts(new URLSearchParams()).meta.facets.brands[0]!.value

describe("FilterSidebar", () => {
  it("checking a brand writes it to the URL, unchecking removes it", async () => {
    const app = await renderWithProviders(<Sidebar />, {
      route: "/products?page=3",
    })
    const box = screen.getByRole("checkbox", { name: new RegExp(`^${brand}`) })
    expect(box).not.toBeChecked()

    await app.user.click(box)
    expect(box).toBeChecked()
    const search = new URLSearchParams(app.location().search)
    expect(search.getAll("brand")).toEqual([brand])
    expect(search.has("page")).toBe(false) // a filter change resets the page

    await app.user.click(box)
    expect(new URLSearchParams(app.location().search).has("brand")).toBe(false)
  })

  it("reads the initial state from the URL", async () => {
    await renderWithProviders(<Sidebar />, {
      route: `/products?brand=${encodeURIComponent(brand)}&inStock=true&minRating=4`,
    })
    expect(
      screen.getByRole("checkbox", { name: new RegExp(`^${brand}`) })
    ).toBeChecked()
    expect(
      screen.getByRole("checkbox", { name: /in stock only/i })
    ).toBeChecked()
    expect(screen.getByRole("radio", { name: /4 stars/i })).toBeChecked()
  })

  it("rating radios and the stock switch update the URL", async () => {
    const app = await renderWithProviders(<Sidebar />, { route: "/products" })
    await app.user.click(screen.getByRole("radio", { name: /3 stars/i }))
    await app.user.click(
      screen.getByRole("checkbox", { name: /in stock only/i })
    )
    const search = new URLSearchParams(app.location().search)
    expect(search.get("minRating")).toBe("3")
    expect(search.get("inStock")).toBe("true")
  })

  it("keeps an unknown brand from the URL visible so it can be removed", async () => {
    const app = await renderWithProviders(<Sidebar />, {
      route: "/products?brand=Nokia9000",
    })
    const box = screen.getByRole("checkbox", { name: /Nokia9000/ })
    expect(box).toBeChecked()
    await app.user.click(box)
    expect(app.location().search).toBe("")
  })

  it("groups its controls in labelled fieldsets", async () => {
    await renderWithProviders(<Sidebar />)
    for (const name of ["Brand", "Rating"]) {
      expect(
        within(screen.getByRole("group", { name })).getAllByRole(
          name === "Brand" ? "checkbox" : "radio"
        ).length
      ).toBeGreaterThan(0)
    }
  })
})
