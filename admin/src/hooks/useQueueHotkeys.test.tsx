import { render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { useQueueHotkeys } from "./useQueueHotkeys"

function Harness({
  onA,
  enabled = true,
}: {
  onA: () => void
  enabled?: boolean
}) {
  useQueueHotkeys({ a: onA }, enabled)
  return (
    <div>
      <input aria-label="note" />
      <div role="dialog">
        <button>inside</button>
      </div>
      <button>outside</button>
    </div>
  )
}

describe("useQueueHotkeys", () => {
  it("fires on the key, case-insensitively, from the page", async () => {
    const onA = vi.fn()
    render(<Harness onA={onA} />)
    await userEvent.keyboard("a")
    await userEvent.keyboard("{Shift>}A{/Shift}")
    expect(onA).toHaveBeenCalledTimes(2)
  })
  it("ignores typing in a field, inside a dialog, and with Ctrl/Meta held", async () => {
    const onA = vi.fn()
    const { getByLabelText, getByText } = render(<Harness onA={onA} />)
    await userEvent.click(getByLabelText("note"))
    await userEvent.keyboard("a")
    await userEvent.click(getByText("inside"))
    await userEvent.keyboard("a")
    await userEvent.click(getByText("outside"))
    await userEvent.keyboard("{Control>}a{/Control}")
    expect(onA).not.toHaveBeenCalled()
  })
  it("does nothing when disabled and unsubscribes on unmount", async () => {
    const onA = vi.fn()
    const { rerender, unmount } = render(<Harness onA={onA} enabled={false} />)
    await userEvent.keyboard("a")
    expect(onA).not.toHaveBeenCalled()
    rerender(<Harness onA={onA} />)
    await userEvent.keyboard("a")
    expect(onA).toHaveBeenCalledTimes(1)
    unmount()
    await userEvent.keyboard("a")
    expect(onA).toHaveBeenCalledTimes(1)
  })
})
