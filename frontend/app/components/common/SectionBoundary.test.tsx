import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as report from "@/lib/report"
import { installGlobalErrorReporting } from "@/lib/globalErrors"
import { productDetail } from "@/test/msw/db"
import { renderApp } from "@/test/render"

import { SectionBoundary } from "./SectionBoundary"

let shouldThrow = true
function Flaky() {
  if (shouldThrow) throw new Error("widget exploded")
  return <p>widget fine</p>
}

beforeEach(() => {
  shouldThrow = true
  // React logs caught render errors; the report spy is what the app itself uses.
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("SectionBoundary", () => {
  it("a render error shows an accessible fallback; Try again recovers", async () => {
    const reportSpy = vi.spyOn(report, "reportError")
    const user = userEvent.setup()
    render(
      <SectionBoundary label="reviews">
        <Flaky />
      </SectionBoundary>
    )
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("Could not load reviews.")
    expect(reportSpy).toHaveBeenCalledTimes(1)
    expect(reportSpy.mock.calls[0]?.[1]).toBe("boundary:reviews")

    shouldThrow = false
    const retry = screen.getByRole("button", { name: "Try again" })
    retry.focus()
    expect(retry).toHaveFocus() // reachable by keyboard
    await user.keyboard("{Enter}")
    expect(screen.getByText("widget fine")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("resetKeys re-arm the boundary without a click (a new product)", () => {
    function Page() {
      const [id, setId] = useState("a")
      return (
        <>
          <button
            onClick={() => {
              shouldThrow = false
              setId("b")
            }}
          >
            next product
          </button>
          <SectionBoundary label="reviews" resetKeys={[id]}>
            <Flaky />
          </SectionBoundary>
        </>
      )
    }
    render(<Page />)
    expect(screen.getByRole("alert")).toBeInTheDocument()
    screen.getByRole("button", { name: "next product" }).click()
    return screen.findByText("widget fine")
  })

  it("siblings are untouched", () => {
    render(
      <>
        <p>the rest of the page</p>
        <SectionBoundary label="a rail">
          <Flaky />
        </SectionBoundary>
      </>
    )
    expect(screen.getByText("the rest of the page")).toBeInTheDocument()
  })
})

describe("global error reporting: each uncaught error once", () => {
  let uninstall: () => void
  afterEach(() => uninstall?.())

  it("reports an uncaught error and an unhandled rejection exactly once each", () => {
    const reportSpy = vi
      .spyOn(report, "reportError")
      .mockImplementation(() => {})
    uninstall = installGlobalErrorReporting()
    const err = new Error("from a timer")
    window.dispatchEvent(
      new ErrorEvent("error", { error: err, message: err.message })
    )
    window.dispatchEvent(
      new ErrorEvent("error", { error: err, message: err.message })
    ) // the same error again
    const reason = new Error("nobody awaited me")
    const rejection = Object.assign(new Event("unhandledrejection"), { reason })
    window.dispatchEvent(rejection)
    window.dispatchEvent(rejection)
    expect(reportSpy).toHaveBeenCalledTimes(2)
    expect(reportSpy).toHaveBeenNthCalledWith(1, err, "window.onerror")
    expect(reportSpy).toHaveBeenNthCalledWith(2, reason, "unhandledrejection")
  })

  it("installing twice (StrictMode) and uninstalling leaves nothing behind", () => {
    const reportSpy = vi
      .spyOn(report, "reportError")
      .mockImplementation(() => {})
    const first = installGlobalErrorReporting()
    first()
    uninstall = installGlobalErrorReporting()
    window.dispatchEvent(new ErrorEvent("error", { error: new Error("x") }))
    expect(reportSpy).toHaveBeenCalledTimes(1)
  })

  it("a caller's own abort is not an error", () => {
    const reportSpy = vi
      .spyOn(report, "reportError")
      .mockImplementation(() => {})
    uninstall = installGlobalErrorReporting()
    const abort = Object.assign(new Event("unhandledrejection"), {
      reason: new DOMException("x", "AbortError"),
    })
    window.dispatchEvent(abort)
    expect(reportSpy).not.toHaveBeenCalled()
  })
})

describe("the product page survives a crashed reviews widget", () => {
  it("reviews fall back; the buy box stays interactive; Try again brings reviews back", async () => {
    const app = await renderApp({
      route: `/p/${productDetail.slug}?tab=reviews`,
    })
    await screen.findByRole("heading", { level: 1, name: productDetail.name })

    await app.user.click(
      await screen.findByRole("button", { name: "Crash this widget (reviews)" })
    )
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load reviews."
    )

    // the rest of the page still works
    await app.user.click(screen.getByRole("radio", { name: "Black" }))
    await app.user.click(screen.getByRole("radio", { name: "128 GB" }))
    await app.user.click(
      screen.getAllByRole("button", { name: /^Increase quantity/ })[0]!
    )
    expect(
      screen.getAllByRole("textbox", { name: /^Quantity/ })[0]
    ).toHaveValue("2")

    await app.user.click(screen.getByRole("button", { name: "Try again" }))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Crash this widget (reviews)" })
    ).toBeInTheDocument()
  })
})
