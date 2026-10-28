import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { PriceRangeFilter } from "./PriceRangeFilter"

const bounds = { min: 100, max: 10_000 }

function setup() {
  const onChange = vi.fn()
  render(
    <PriceRangeFilter
      bounds={bounds}
      histogram={[]}
      min={undefined}
      max={undefined}
      onChange={onChange}
    />
  )
  const slider = document.querySelector<HTMLInputElement>("input[type=range]")!
  return { onChange, slider }
}

describe("PriceRangeFilter price ceiling slider (13.2)", () => {
  it("dragging only changes the label; the filter is committed once, on release", () => {
    const { onChange, slider } = setup()
    expect(slider.value).toBe("10000")
    for (const v of [9000, 8000, 5000])
      fireEvent.change(slider, { target: { value: v } })
    expect(screen.getByText("₹5,000")).toBeInTheDocument() // live feedback while dragging
    expect(onChange).not.toHaveBeenCalled() // ...without touching the URL / request

    fireEvent.pointerUp(slider)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(undefined, 5000)
  })

  it("releasing without moving commits nothing", () => {
    const { onChange, slider } = setup()
    fireEvent.pointerUp(slider)
    fireEvent.blur(slider)
    expect(onChange).not.toHaveBeenCalled()
  })

  it("keyboard: each arrow key release commits", () => {
    const { onChange, slider } = setup()
    fireEvent.change(slider, { target: { value: 9900 } })
    fireEvent.keyUp(slider, { key: "ArrowLeft" })
    expect(onChange).toHaveBeenCalledWith(undefined, 9900)
  })
})
