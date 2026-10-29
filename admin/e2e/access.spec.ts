import { expect, test } from "@playwright/test"

import { apiToken, expectSignedInShell, signIn } from "./support/auth"

test.describe("who can see what", () => {
  test("a logged-out deep link goes to login and comes back to the same URL after signing in", async ({
    page,
  }) => {
    await page.goto(
      "/orders?status=placed&page=1&pageSize=20&sort=createdAt&order=desc"
    )
    await expect(page).toHaveURL(/\/login\?redirect=/)
    await page.getByLabel("Email").fill("admin@shopsphere.dev")
    await page.getByLabel("Password").fill("Password123")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL(/\/orders\?.*status=placed/)
    await expectSignedInShell(page)
  })

  test("a customer gets the no-permission screen and no admin request is made", async ({
    page,
  }) => {
    const adminCalls: string[] = []
    page.on("request", (r) => {
      if (/\/api\/v1\/(admin|seller)\//.test(r.url())) adminCalls.push(r.url())
    })
    await signIn(page, "customer")
    await expect(
      page.getByRole("heading", { name: "No permission" })
    ).toBeVisible()
    await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0)
    expect(adminCalls).toEqual([])
  })

  test("the API, not the UI, protects data: a customer token gets 403 from admin endpoints", async ({
    request,
  }) => {
    const token = await apiToken(request, "customer")
    const res = await request.get("http://localhost:4000/api/v1/admin/orders", {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(403)
  })

  test("sign-out clears the session: no token or cookie readable from JavaScript, reload lands on login", async ({
    page,
  }) => {
    await signIn(page, "admin")
    await expectSignedInShell(page)
    const stored = await page.evaluate(() => ({
      local: JSON.stringify(localStorage),
      session: JSON.stringify(sessionStorage),
      cookie: document.cookie,
    }))
    expect(stored.cookie).toBe("") // the refresh cookie is httpOnly
    expect(stored.local + stored.session).not.toMatch(/eyJ/) // no JWT anywhere in storage
    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL(/\/login/)
    await page.goto("/orders")
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })
})

test.describe("seller mode", () => {
  test("a seller sees only their own products and cannot reach another seller's, by API or UI", async ({
    page,
    request,
  }) => {
    await signIn(page, "seller", "/products")
    await expectSignedInShell(page)
    const nav = page.getByRole("navigation", { name: "Main" })
    await expect(nav.getByRole("link", { name: "Products" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Users" })).toHaveCount(0)
    await expect(nav.getByRole("link", { name: "Audit log" })).toHaveCount(0)
    await expect(nav.getByRole("link", { name: "Coupons" })).toHaveCount(0)

    await expect(page.getByRole("table").getByRole("row").nth(1)).toBeVisible()

    // A product of the OTHER seller, read through the seller API with this seller's token: 404 (not 403, not data)
    const s2 = await apiToken(request, "seller2")
    const theirs = await request.get(
      "http://localhost:4000/api/v1/seller/products?limit=1",
      {
        headers: { Authorization: `Bearer ${s2}` },
      }
    )
    const otherId = ((await theirs.json()) as { data: { _id: string }[] })
      .data[0]._id
    const s1 = await apiToken(request, "seller")
    const read = await request.get(
      `http://localhost:4000/api/v1/seller/products/${otherId}`,
      {
        headers: { Authorization: `Bearer ${s1}` },
      }
    )
    expect(read.status()).toBe(404)
    // ...and by deep link in the UI: the edit page cannot show it
    await page.goto(`/products/${otherId}`)
    await expect(page.getByText(/not found/i).first()).toBeVisible()
    // admin-only routes are refused by the guard
    await page.goto("/users")
    await expect(page).toHaveURL(/\/forbidden/)
  })

  test("switching accounts shows no data of the previous account", async ({
    page,
  }) => {
    await signIn(page, "admin", "/orders")
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible()
    await page.getByRole("button", { name: "Sign out" }).click()
    await signIn(page, "seller", "/orders")
    await expect(
      page.getByRole("heading", { name: /containing your products/i })
    ).toBeVisible()
    // the seller's table never shows a customer e-mail address (the admin's list did)
    await expect(page.getByRole("table")).not.toContainText("@shopsphere.dev")
  })
})
