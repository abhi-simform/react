import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { API } from "@/test/msw/handlers"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"

import * as bugs from "./bugs"

/**
 * One regression test per bug. Each runs against the FIXED component (must pass) and against the
 * BROKEN one with `it.fails` (the test must FAIL there: that is the proof it can catch the bug).
 */
type Case = [name: string, run: (impl: "Broken" | "Fixed") => Promise<void>]

const cases: Case[] = [
  [
    "1 stale closure: the ticker keeps counting",
    async (impl) => {
      vi.useFakeTimers()
      const Ticker = impl === "Broken" ? bugs.BrokenTicker : bugs.FixedTicker
      render(<Ticker />)
      await act(async () => void vi.advanceTimersByTime(3000))
      expect(screen.getByText("ticks: 3")).toBeInTheDocument()
    },
  ],
  [
    "2 missing key: text stays with its own row after a removal",
    async (impl) => {
      const Notes = impl === "Broken" ? bugs.BrokenNotes : bugs.FixedNotes
      const user = userEvent.setup()
      render(
        <Notes
          initial={[
            { id: "a", label: "Alpha" },
            { id: "b", label: "Beta" },
          ]}
        />
      )
      await user.type(screen.getByLabelText("Note for Beta"), "mine")
      await user.click(screen.getByRole("button", { name: "Remove Alpha" }))
      expect(screen.getByLabelText("Note for Beta")).toHaveValue("mine")
    },
  ],
  [
    "3 wrong dependency array: a new id loads the new title",
    async (impl) => {
      const Title = impl === "Broken" ? bugs.BrokenTitle : bugs.FixedTitle
      const load = vi.fn(async (id: string) => `Title ${id}`)
      const { rerender } = render(<Title id="A" load={load} />)
      expect(await screen.findByText("Title A")).toBeInTheDocument()
      rerender(<Title id="B" load={load} />)
      expect(await screen.findByText("Title B")).toBeInTheDocument()
    },
  ],
  [
    "4 unhandled 4xx: a missing product shows an error, not 'Loading...' forever",
    async (impl) => {
      const Product = impl === "Broken" ? bugs.BrokenProduct : bugs.FixedProduct
      // the Broken version's rejection is unhandled by design: observe it instead of crashing the run
      const swallow = (e: PromiseRejectionEvent) => e.preventDefault()
      window.addEventListener("unhandledrejection", swallow)
      process.on("unhandledRejection", () => {})
      server.use(
        http.get(`${API}/products/:slug`, () =>
          HttpResponse.json(
            {
              success: false,
              error: { code: "NOT_FOUND", message: "Product not found" },
            },
            { status: 404 }
          )
        )
      )
      await renderWithProviders(<Product slug="gone" />)
      expect(
        await screen.findByRole("alert", {}, { timeout: 800 })
      ).toHaveTextContent("Product not found")
      window.removeEventListener("unhandledrejection", swallow)
    },
  ],
  [
    "5 race condition: the answer for the NEWEST query wins",
    async (impl) => {
      const Search = impl === "Broken" ? bugs.BrokenSearch : bugs.FixedSearch
      const user = userEvent.setup()
      // "a" answers slowly, "ab" quickly: the slow, stale answer arrives LAST
      const search = (q: string) =>
        new Promise<string[]>((resolve) =>
          setTimeout(() => resolve([`result for ${q}`]), q === "a" ? 60 : 5)
        )
      render(<Search search={search} />)
      await user.type(screen.getByLabelText("Search"), "ab")
      await waitFor(() =>
        expect(screen.getByText("result for ab")).toBeInTheDocument()
      )
      await new Promise((r) => setTimeout(r, 120)) // let the slow answer land (the bug's window)
      expect(screen.getByText("result for ab")).toBeInTheDocument()
      expect(screen.queryByText("result for a")).not.toBeInTheDocument()
    },
  ],
  [
    "6 memory leak: nothing listens after unmount",
    async (impl) => {
      const Watcher =
        impl === "Broken" ? bugs.BrokenResizeWatcher : bugs.FixedResizeWatcher
      const onWide = vi.fn()
      const { unmount } = render(<Watcher onWide={onWide} />)
      unmount()
      window.dispatchEvent(new Event("resize"))
      expect(onWide).not.toHaveBeenCalled()
    },
  ],
  [
    "7 layout shift: the photo reserves its box before it loads",
    async (impl) => {
      const Photo = impl === "Broken" ? bugs.BrokenPhoto : bugs.FixedPhoto
      render(<Photo src="/x.png" name="Phone" />)
      const img = screen.getByRole("img", { name: "Phone" })
      expect(img).toHaveAttribute("width")
      expect(img).toHaveAttribute("height")
    },
  ],
  [
    "8 wrong cache key: each category shows its own list",
    async (impl) => {
      const List =
        impl === "Broken" ? bugs.BrokenCategoryList : bugs.FixedCategoryList
      const list = vi.fn(async (c: string) => [`${c} item`])
      function Tabs() {
        const [category, setCategory] = useState("phones")
        return (
          <>
            <button onClick={() => setCategory("laptops")}>Show laptops</button>
            <List category={category} list={list} />
          </>
        )
      }
      const { user } = await renderWithProviders(<Tabs />)
      expect(await screen.findByText("phones item")).toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: "Show laptops" }))
      expect(await screen.findByText("laptops item")).toBeInTheDocument()
    },
  ],
]

afterEach(() => vi.useRealTimers())

describe.each(cases)("bug %s", (_name, run) => {
  it("fixed version passes", async () => {
    await run("Fixed")
  })
  it.fails("broken version is caught by the same test", async () => {
    await run("Broken")
  })
})
