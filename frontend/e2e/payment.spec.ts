import { expect, test } from "./support/fixtures"
import { ShopPage } from "./pages/ShopPage"

/**
 * Razorpay in CI: the real checkout iframe is never automated (third-party UI, bank redirects,
 * OTPs, anti-bot). The API runs its MOCK gateway (`/payments/config` says `mock: true`), and
 * the UI states are driven by intercepting the payment endpoints with `page.route`.
 * The real test-card payment is done by hand once per release (docs/payments-manual-test.md).
 */
test.describe("online payment states (mock gateway, intercepted endpoints)", () => {
  test.beforeEach(async ({ signedIn: page }) => {
    const shop = new ShopPage(page)
    await shop.clearCart()
    await shop.addCheapestProduct()
    await shop.fillCheckout("razorpay")
    await page
      .getByRole("button", { name: /place order and continue to payment/i })
      .click()
    await expect(page.getByTestId("payment-panel")).toBeVisible()
  })

  test("starting the payment fails on our server: an explained error, nothing charged", async ({
    signedIn: page,
  }) => {
    await page.route("**/api/v1/payments/create-order", (route) =>
      route.fulfill({
        status: 500,
        json: { success: false, error: { code: "INTERNAL", message: "Boom" } },
      })
    )
    await page.getByRole("button", { name: /^Pay / }).click()
    await expect(
      page.getByRole("alert").filter({ hasText: "Nothing was charged" })
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible()
  })

  test("closing the payment window leaves the order waiting, with a retry", async ({
    signedIn: page,
  }) => {
    await page.getByRole("button", { name: /^Pay / }).click()
    const gateway = page.getByTestId("mock-gateway")
    await expect(gateway).toBeVisible()
    await gateway.getByRole("button", { name: "Close without paying" }).click()
    await expect(page.getByTestId("payment-dismissed")).toBeVisible()
    await expect(
      page.getByRole("button", { name: /^Retry payment/ })
    ).toBeVisible()
  })

  test("a declined card shows the failure, and a retry can succeed", async ({
    signedIn: page,
  }) => {
    await page.getByRole("button", { name: /^Pay / }).click()
    await page
      .getByTestId("mock-gateway")
      .getByRole("button", { name: /failing card/ })
      .click()
    await expect(page.getByTestId("payment-failed")).toBeVisible()

    await page.getByRole("button", { name: /^Retry payment/ }).click()
    await page
      .getByTestId("mock-gateway")
      .getByRole("button", { name: /test card \(success\)/ })
      .click()
    // the SERVER decides: the panel disappears and the page reports the money as received
    await expect(page.getByTestId("paid-note")).toBeVisible({ timeout: 20_000 })
  })

  test("a verification the server rejects is shown as a mismatch, never as success", async ({
    signedIn: page,
  }) => {
    await page.route("**/api/v1/payments/verify", (route) =>
      route.fulfill({
        status: 400,
        json: {
          success: false,
          error: { code: "SIGNATURE_MISMATCH", message: "bad signature" },
        },
      })
    )
    await page.getByRole("button", { name: /^Pay / }).click()
    await page
      .getByTestId("mock-gateway")
      .getByRole("button", { name: /test card \(success\)/ })
      .click()
    await expect(page.getByTestId("payment-mismatch")).toBeVisible()
    await expect(page.getByTestId("paid-note")).toBeHidden()
  })
})
