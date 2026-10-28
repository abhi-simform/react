import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { QuantityStepper } from "./QuantityStepper"

/** The stepper is controlled: a tiny parent keeps the committed value like a real page does. */
function Harness({
  initial = 2,
  max = 5,
  min,
  onChange,
}: {
  initial?: number
  max?: number
  min?: number
  onChange?: (n: number) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <QuantityStepper
      value={value}
      max={max}
      min={min}
      onValueChange={(n) => {
        setValue(n)
        onChange?.(n)
      }}
    />
  )
}

const input = () => screen.getByRole("textbox", { name: "Quantity" })

describe("QuantityStepper", () => {
  it("increase and decrease change the value", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole("button", { name: "Increase quantity" }))
    expect(input()).toHaveValue("3")
    await user.click(screen.getByRole("button", { name: "Decrease quantity" }))
    await user.click(screen.getByRole("button", { name: "Decrease quantity" }))
    expect(input()).toHaveValue("1")
  })

  it("disables the buttons at the limits", async () => {
    const { rerender } = render(
      <QuantityStepper value={1} max={5} onValueChange={() => {}} />
    )
    expect(
      screen.getByRole("button", { name: "Decrease quantity" })
    ).toBeDisabled()
    rerender(<QuantityStepper value={5} max={5} onValueChange={() => {}} />)
    expect(
      screen.getByRole("button", { name: "Increase quantity" })
    ).toBeDisabled()
  })

  it.each([
    ["99", "5"], // above the stock: clamped on blur
    ["0", "1"], // below the minimum
    ["abc", "2"], // garbage: falls back to the last committed value
    ["", "2"],
  ])("typing %j settles to %s on blur", async (typed, settled) => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.clear(input())
    if (typed) await user.type(input(), typed)
    await user.tab()
    expect(input()).toHaveValue(settled)
  })

  it("commits a valid number while typing, but not an out-of-range one", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.clear(input())
    await user.type(input(), "4")
    expect(onChange).toHaveBeenLastCalledWith(4)
    await user.clear(input())
    onChange.mockClear()
    await user.type(input(), "9")
    expect(onChange).not.toHaveBeenCalled()
  })

  it("Enter commits (clamped) without leaving the field", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.clear(input())
    await user.type(input(), "50{Enter}")
    expect(input()).toHaveValue("5")
    expect(input()).toHaveFocus()
  })

  it("the field has an accessible name, and the change is announced politely", () => {
    render(<Harness />)
    expect(input()).toHaveAccessibleName("Quantity")
    expect(screen.getByText("Quantity 2")).toHaveAttribute(
      "aria-live",
      "polite"
    )
  })

  it("max below min behaves as min (stock 0 does not break it)", () => {
    render(<QuantityStepper value={1} max={0} onValueChange={() => {}} />)
    expect(
      screen.getByRole("button", { name: "Increase quantity" })
    ).toBeDisabled()
  })
})
