import { screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { activateLanguage, i18n } from "@/lib/i18n"
import { getLocale } from "@/lib/locale"
import { renderWithProviders } from "@/test/render"

import { LocaleSwitcher } from "./LocaleSwitcher"
import { useT } from "./LocaleProvider"

function Strings() {
  const t = useT("common")
  const tc = useT("cart")
  return (
    <div>
      <p data-testid="nav">{t("nav.products")}</p>
      <p data-testid="items">{t("header.openCart", { count: 2 })}</p>
      <p data-testid="empty">{tc("emptyTitle")}</p>
    </div>
  )
}

describe("plurals (en / hi / pseudo-RTL), 0 / 1 / 2 / many", () => {
  const cases: [number, string][] = [
    [0, "Open cart, 0 items"],
    [1, "Open cart, 1 item"],
    [2, "Open cart, 2 items"],
    [25, "Open cart, 25 items"],
  ]
  it.each(cases)("English: %i", (count, text) => {
    expect(i18n.t("header.openCart", { count, ns: "common", lng: "en" })).toBe(
      text
    )
  })
  it("Hindi has its own strings and plural forms (0 and 1 are both 'one' in Hindi)", async () => {
    await activateLanguage("hi")
    const hi = (count: number) =>
      i18n.t("header.openCart", { count, ns: "common", lng: "hi" })
    expect(hi(1)).toBe("कार्ट खोलें, 1 वस्तु")
    expect(hi(0)).toBe("कार्ट खोलें, 0 वस्तु")
    expect(hi(2)).toBe("कार्ट खोलें, 2 वस्तुएँ")
    await activateLanguage("en")
  })
})

describe("switching language (13.8)", () => {
  it("updates the strings without a reload, sets <html lang dir>, persists, and the chunk is loaded on demand", async () => {
    const app = await renderWithProviders(
      <>
        <LocaleSwitcher />
        <Strings />
      </>
    )
    expect(screen.getByTestId("nav")).toHaveTextContent("Products")
    expect(document.documentElement.lang).toBe("en")

    await app.user.selectOptions(screen.getByLabelText("Language"), "hi")
    await waitFor(() =>
      expect(screen.getByTestId("nav")).toHaveTextContent("उत्पाद")
    )
    expect(screen.getByTestId("items")).toHaveTextContent(
      "कार्ट खोलें, 2 वस्तुएँ"
    )
    expect(screen.getByTestId("empty")).toHaveTextContent("आपका कार्ट खाली है")
    expect(document.documentElement.lang).toBe("hi")
    expect(document.documentElement.dir).toBe("ltr")
    expect(
      JSON.parse(localStorage.getItem("shopsphere.locale")!).language
    ).toBe("hi")
    expect(getLocale().language).toBe("hi")

    // The labels of the switcher themselves are translated too.
    expect(screen.getByLabelText("भाषा")).toBeInTheDocument()
  })

  it("a right-to-left language mirrors the document direction", async () => {
    const app = await renderWithProviders(<LocaleSwitcher />)
    await app.user.selectOptions(screen.getByLabelText("Language"), "ar")
    await waitFor(() => expect(document.documentElement.dir).toBe("rtl"))
    await app.user.selectOptions(screen.getByLabelText(/Language|‏/), "en")
    await waitFor(() => expect(document.documentElement.dir).toBe("ltr"))
  })

  it("a missing key falls back to English instead of showing the raw key", async () => {
    await activateLanguage("hi")
    expect(
      i18n.t("nope.missing", {
        ns: "common",
        lng: "hi",
        defaultValue: undefined,
      })
    ).toBe("nope.missing")
    expect(i18n.t("header.cart", { ns: "common", lng: "xx" })).toBe("Cart") // unknown language -> English
    await activateLanguage("en")
  })
})
