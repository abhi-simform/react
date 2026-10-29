import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe } from "vitest-axe"
import { describe, expect, it, vi } from "vitest"

import { OrderStatusBar } from "./OrderStatusBar"
import type { ORDER_STATUSES } from "./types"

const setup = (status: (typeof ORDER_STATUSES)[number], busy = false) => {
  const onSubmit = vi.fn()
  render(
    <OrderStatusBar
      status={status}
      orderNumber="SS-1"
      busy={busy}
      onSubmit={onSubmit}
    />
  )
  return onSubmit
}
const labels = () => screen.queryAllByRole("button").map((b) => b.textContent)

describe("<OrderStatusBar>", () => {
  it.each([
    ["placed", ["Mark packed", "Cancel order..."]],
    ["packed", ["Ship..."]],
    ["shipped", ["Out for delivery", "Mark delivered"]],
    ["return_requested", ["Approve return...", "Reject return..."]],
    ["returned", ["Mark refunded..."]],
  ] as const)("a %s order offers exactly %j", (status, expected) => {
    setup(status)
    expect(labels()).toEqual([...expected])
  })

  it.each(["cancelled", "refunded", "delivered"] as const)(
    "a %s order offers no staff action",
    (status) => {
      setup(status)
      expect(labels()).toEqual([])
      expect(screen.getByText(/no further staff actions/)).toBeInTheDocument()
    }
  )

  it("a plain move submits at once", async () => {
    const onSubmit = setup("placed")
    await userEvent.click(screen.getByRole("button", { name: "Mark packed" }))
    expect(onSubmit).toHaveBeenCalledWith({ status: "packed" })
  })

  it("shipping needs a tracking id, then sends carrier + tracking", async () => {
    const onSubmit = setup("packed")
    await userEvent.click(screen.getByRole("button", { name: "Ship..." }))
    const dialog = await screen.findByRole("dialog")
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Mark shipped" })
    )
    expect(within(dialog).getByRole("alert")).toHaveTextContent(/tracking id/i)
    expect(onSubmit).not.toHaveBeenCalled()
    await userEvent.type(
      within(dialog).getByLabelText("Tracking id"),
      "DLV12345"
    )
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Mark shipped" })
    )
    expect(onSubmit).toHaveBeenCalledWith({
      status: "shipped",
      shipment: { carrier: "Delhivery", trackingId: "DLV12345" },
    })
  })

  it("cancelling needs a reason of 3+ characters and shows the impact", async () => {
    const onSubmit = setup("placed")
    await userEvent.click(
      screen.getByRole("button", { name: "Cancel order..." })
    )
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent(/stock is released/i)
    await userEvent.type(within(dialog).getByLabelText(/reason/i), "no")
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancel order" })
    )
    expect(within(dialog).getByRole("alert")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
    await userEvent.type(
      within(dialog).getByLabelText(/reason/i),
      " longer reason"
    )
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancel order" })
    )
    expect(onSubmit).toHaveBeenCalledWith({
      status: "cancelled",
      note: "no longer reason",
    })
  })

  it("refunding an order asks for confirmation first", async () => {
    const onSubmit = setup("returned")
    await userEvent.click(
      screen.getByRole("button", { name: "Mark refunded..." })
    )
    const dialog = await screen.findByRole("alertdialog")
    expect(onSubmit).not.toHaveBeenCalled()
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Confirm" })
    )
    expect(onSubmit).toHaveBeenCalledWith({ status: "refunded" })
  })

  it("disables every action while a request is in flight (no double submit)", () => {
    setup("placed", true)
    for (const b of screen.getAllByRole("button")) expect(b).toBeDisabled()
  })

  it("has no axe violations", async () => {
    const { container } = render(
      <OrderStatusBar status="placed" orderNumber="SS-1" onSubmit={() => {}} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
