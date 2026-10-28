// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"

import { formatCurrency, formatDate, formatRupees, toPriceVM } from "./format"
import {
  displayCurrency,
  getLocale,
  languageFromNavigator,
  readInitialLocale,
  resetLocaleForTests,
  setLocale,
  setRates,
  STORAGE_KEY,
  subscribeLocale,
} from "./locale"

beforeEach(() => {
  localStorage.clear()
  resetLocaleForTests()
})

describe("language detection", () => {
  it("maps the browser language to one we have, English otherwise", () => {
    expect(languageFromNavigator("hi-IN")).toBe("hi")
    expect(languageFromNavigator("HI")).toBe("hi")
    expect(languageFromNavigator("en-US")).toBe("en")
    expect(languageFromNavigator("fr-FR")).toBe("en")
    expect(languageFromNavigator(undefined)).toBe("en")
    // the RTL pseudo-language is never picked automatically
    expect(languageFromNavigator("ar-EG")).toBe("en")
  })

  it("a stored choice wins over the browser; garbage in storage is ignored", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ language: "hi", currency: "USD" })
    )
    expect(readInitialLocale()).toEqual({ language: "hi", currency: "USD" })
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ language: "xx", currency: 5 })
    )
    expect(readInitialLocale().currency).toBe("INR")
    localStorage.setItem(STORAGE_KEY, "{broken")
    expect(readInitialLocale().currency).toBe("INR")
  })

  it("setLocale persists and notifies once per real change", () => {
    let calls = 0
    const off = subscribeLocale(() => calls++)
    setLocale({ language: "hi" })
    setLocale({ language: "hi" }) // same value: no notification
    off()
    expect(calls).toBe(1)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({
      language: "hi",
    })
    expect(getLocale().language).toBe("hi")
  })
})

describe("display currency (prices are charged in INR; this only changes what is SHOWN)", () => {
  it("shows INR until the rate is known, then converts", () => {
    setLocale({ currency: "USD" })
    expect(displayCurrency()).toBe("INR")
    expect(formatRupees(1000)).toBe("₹1,000") // not "$1,000"
    setRates({ USD: 0.0119 })
    expect(displayCurrency()).toBe("USD")
    expect(formatRupees(1000)).toBe("$11.90")
    expect(formatCurrency(100_000)).toBe("$11.90") // paise -> rupees -> USD
  })

  it("an explicit currency is formatted as given, never converted", () => {
    setLocale({ currency: "USD" })
    setRates({ USD: 0.0119 })
    expect(
      toPriceVM(1999, undefined, { locale: "en-US", currency: "USD" }).current
    ).toBe("$1,999")
    expect(formatCurrency(100_000, "INR", "en-IN")).toBe("₹1,000.00")
  })

  it("the price view model follows the display currency and keeps the discount percentage", () => {
    setLocale({ currency: "EUR" })
    setRates({ EUR: 0.0102 })
    const vm = toPriceVM(1000, 2000)
    expect(vm.current).toBe("€10.20")
    expect(vm.mrp).toBe("€20.40")
    expect(vm.discountPercent).toBe(50)
  })
})

describe("numbers and dates follow the language", () => {
  it("Hindi uses the hi-IN locale for dates and grouping", () => {
    const date = "2026-03-12T10:00:00Z"
    setLocale({ language: "en" })
    expect(formatDate(date)).toBe("12 Mar 2026")
    setLocale({ language: "hi" })
    expect(formatDate(date)).toBe(
      new Intl.DateTimeFormat("hi-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(date))
    )
    expect(formatDate(date)).not.toBe("12 Mar 2026")
    expect(formatRupees(123456)).toBe(
      new Intl.NumberFormat("hi-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(123456)
    )
  })
})
