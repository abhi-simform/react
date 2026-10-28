import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AppNotification } from "../schemas"
import { VirtualNotificationList } from "./VirtualNotificationList"

const make = (n: number): AppNotification[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `n-${i}`,
    category: "orders",
    type: "order.shipped",
    title: `Notification ${i}`,
    body: "body",
    link: null,
    data: null,
    read: true,
    createdAt: "2026-10-01T10:00:00.000Z",
  })) as AppNotification[]

function setup(count: number, over: Partial<{ hasNextPage: boolean }> = {}) {
  const fetchNextPage = vi.fn()
  render(
    <MemoryRouter>
      <VirtualNotificationList
        items={make(count)}
        total={2000}
        hasNextPage={over.hasNextPage ?? true}
        isFetchingNextPage={false}
        fetchNextPage={fetchNextPage}
        onOpen={() => undefined}
        renderActions={() => null}
      />
    </MemoryRouter>
  )
  return { fetchNextPage }
}

// jsdom has no layout: every element measures 0 px, so every row would "fit". TanStack Virtual reads
// `offsetHeight`, so give rows a real height.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(76)
})

describe("VirtualNotificationList (13.4)", () => {
  it("renders a window of the rows and numbers them against the full total", () => {
    setup(300)
    const rows = screen.getAllByTestId("notification")
    expect(rows.length).toBeLessThan(60) // not 300
    expect(rows[0]).toHaveAttribute("aria-posinset", "1")
    expect(rows[0]).toHaveAttribute("aria-setsize", "2000")
  })

  it("does not ask for another page while the end of the loaded rows is far away", () => {
    const { fetchNextPage } = setup(300)
    expect(fetchNextPage).not.toHaveBeenCalled()
  })

  it("asks for the next page when the loaded rows are about to run out", () => {
    const { fetchNextPage } = setup(5)
    expect(fetchNextPage).toHaveBeenCalled()
  })

  it("never asks when there is no next page", () => {
    const { fetchNextPage } = setup(5, { hasNextPage: false })
    expect(fetchNextPage).not.toHaveBeenCalled()
  })
})
