import { renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useCountdown } from "./useCountdown"

describe("a countdown mounted LATER must not flash an old value", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("its very first render already uses the current time", () => {
    const t0 = new Date("2026-10-28T12:00:00Z")
    vi.setSystemTime(t0)
    const end = new Date(t0.getTime() + 600_000)
    // first countdown creates the shared store, then is unmounted (timer stops)
    renderHook(() => useCountdown(end)).unmount()
    // an hour-less 5 minutes later a second one mounts
    vi.setSystemTime(new Date(t0.getTime() + 300_000))
    const seen: number[] = []
    renderHook(() => {
      const c = useCountdown(end)
      seen.push(c.minutes)
      return c
    })
    expect(seen[0]).toBe(5) // 5 min left; the stale store said 10
  })
})
