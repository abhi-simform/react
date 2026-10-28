import { screen, waitFor } from "@testing-library/react"
import { http } from "msw"
import { describe, expect, it } from "vitest"

import { WishlistHeart } from "@/features/wishlist"
import { db } from "@/test/msw/db"
import { API, fail } from "@/test/msw/handlers"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"

const heart = () => screen.findByRole("button", { name: /wishlist: Phone/ })

describe("wishlist hearts: optimistic update with rollback", () => {
  it("adds optimistically and the server agrees", async () => {
    const app = await renderWithProviders(
      <WishlistHeart productId="p1" productName="Phone" />,
      { signedIn: true }
    )
    const button = await heart()
    await waitFor(() => expect(button).not.toHaveAttribute("aria-disabled"))
    expect(button).toHaveAttribute("aria-pressed", "false")
    await app.user.click(button)
    expect(button).toHaveAttribute("aria-pressed", "true") // instantly, before the server answered
    await waitFor(() => expect(db.wishlist.has("p1")).toBe(true))
    expect(button).toHaveAttribute("aria-pressed", "true")
  })

  it("rolls back and says so when the server answers 500", async () => {
    server.use(
      http.post(`${API}/wishlist`, () => fail(500, "INTERNAL", "Boom"))
    )
    const app = await renderWithProviders(
      <WishlistHeart productId="p1" productName="Phone" />,
      { signedIn: true }
    )
    const button = await heart()
    await waitFor(() => expect(button).not.toHaveAttribute("aria-disabled"))
    await app.user.click(button)
    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "false"))
    expect(
      await screen.findByText("Could not save it to your wishlist")
    ).toBeInTheDocument()
    expect(db.wishlist.has("p1")).toBe(false)
  })

  it("removing a wishlisted product rolls back on 500 too", async () => {
    db.wishlist.add("p1")
    server.use(
      http.delete(`${API}/wishlist/:id`, () => fail(500, "INTERNAL", "Boom"))
    )
    const app = await renderWithProviders(
      <WishlistHeart productId="p1" productName="Phone" />,
      { signedIn: true }
    )
    const button = await heart()
    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"))
    await waitFor(() => expect(button).not.toHaveAttribute("aria-disabled"))
    await app.user.click(button)
    expect(
      await screen.findByText("Could not remove it from your wishlist")
    ).toBeInTheDocument()
    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"))
  })

  it("a signed-out visitor is sent to log in instead (no request)", async () => {
    let posts = 0
    server.use(
      http.post(`${API}/wishlist`, () => (posts++, fail(500, "X", "x")))
    )
    const app = await renderWithProviders(
      <WishlistHeart productId="p1" productName="Phone" />,
      {
        route: "/products?brand=Apple",
        routes: [{ path: "/login", element: <p>Login page</p> }],
        path: "/products",
      }
    )
    await app.user.click(await heart())
    expect(await screen.findByText("Login page")).toBeInTheDocument()
    expect(app.location().search).toContain("from=")
    expect(posts).toBe(0)
  })
})
