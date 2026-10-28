import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useCountdown } from "./useCountdown"
import { useDebounce, useDebouncedCallback } from "./useDebounce"
import { useLocalStorage } from "./useLocalStorage"
import { useMediaQuery } from "./useMediaQuery"
import { activeNowTimers } from "./useNow"

describe("fake timers: nothing here really waits", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  describe("useDebounce", () => {
    it("settles only after the delay; the last value wins", () => {
      const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), {
        initialProps: { v: "a" },
      })
      expect(result.current).toBe("a")
      rerender({ v: "ab" })
      act(() => void vi.advanceTimersByTime(299))
      expect(result.current).toBe("a")
      rerender({ v: "abc" }) // restarts the clock
      act(() => void vi.advanceTimersByTime(299))
      expect(result.current).toBe("a")
      act(() => void vi.advanceTimersByTime(1))
      expect(result.current).toBe("abc")
    })
    it("clears its timer on unmount", () => {
      const { rerender, unmount } = renderHook(({ v }) => useDebounce(v, 300), {
        initialProps: { v: 1 },
      })
      rerender({ v: 2 })
      expect(vi.getTimerCount()).toBe(1)
      unmount()
      expect(vi.getTimerCount()).toBe(0)
    })
  })

  describe("useDebouncedCallback", () => {
    it("runs once, after the LAST call, with the newest callback", () => {
      const first = vi.fn()
      const second = vi.fn()
      const { result, rerender } = renderHook(
        ({ fn }) => useDebouncedCallback(fn, 100),
        { initialProps: { fn: first } }
      )
      result.current("x")
      rerender({ fn: second })
      result.current("y")
      act(() => void vi.advanceTimersByTime(100))
      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledExactlyOnceWith("y")
    })
    it("does not fire after unmount", () => {
      const fn = vi.fn()
      const { result, unmount } = renderHook(() =>
        useDebouncedCallback(fn, 100)
      )
      result.current()
      unmount()
      act(() => void vi.advanceTimersByTime(500))
      expect(fn).not.toHaveBeenCalled()
    })
  })

  describe("useCountdown", () => {
    const start = new Date("2026-10-28T12:00:00Z")
    beforeEach(() => vi.setSystemTime(start))
    const endsIn = (s: number) => new Date(start.getTime() + s * 1000)

    it("ticks down from the clock, and expires at zero", () => {
      const { result } = renderHook(() => useCountdown(endsIn(3)))
      expect(result.current).toMatchObject({ seconds: 3, isExpired: false })
      act(() => void vi.advanceTimersByTime(1000))
      expect(result.current.seconds).toBe(2)
      act(() => void vi.advanceTimersByTime(2000))
      expect(result.current).toMatchObject({ remainingMs: 0, isExpired: true })
    })
    it("stops its interval once expired, and on unmount", () => {
      const { unmount } = renderHook(() => useCountdown(endsIn(2)))
      expect(activeNowTimers()).toBe(1)
      act(() => void vi.advanceTimersByTime(2000))
      expect(activeNowTimers()).toBe(0)
      const second = renderHook(() => useCountdown(endsIn(60)))
      expect(activeNowTimers()).toBe(1)
      second.unmount()
      expect(activeNowTimers()).toBe(0)
      unmount()
      expect(vi.getTimerCount()).toBe(0)
    })
    it("applies the server offset: a server 10 s ahead ends the deal 10 s earlier here", () => {
      const { result } = renderHook(() =>
        useCountdown(endsIn(30), { serverOffsetMs: 10_000 })
      )
      expect(result.current.seconds).toBe(20)
    })
    it("an invalid date is expired, with no timer", () => {
      const { result } = renderHook(() => useCountdown("not a date"))
      expect(result.current.isExpired).toBe(true)
      expect(activeNowTimers()).toBe(0)
    })
    it("catches up after the tab slept (computed from the clock, not by counting ticks)", () => {
      const { result } = renderHook(() => useCountdown(endsIn(600)))
      vi.setSystemTime(new Date(start.getTime() + 300_000)) // 5 minutes pass without a tick
      act(() => void vi.advanceTimersByTime(1000))
      expect(result.current.minutes).toBe(4) // 5 min - 1 s left
    })
  })
})

describe("useLocalStorage", () => {
  it("round-trips JSON and updates other consumers", () => {
    const a = renderHook(() => useLocalStorage("k", { n: 1 }))
    const b = renderHook(() => useLocalStorage("k", { n: 1 }))
    act(() => a.result.current[1]({ n: 2 }))
    expect(b.result.current[0]).toEqual({ n: 2 })
    expect(localStorage.getItem("k")).toBe('{"n":2}')
    act(() => a.result.current[2]())
    expect(b.result.current[0]).toEqual({ n: 1 })
  })
  it("corrupt JSON falls back to the initial value instead of throwing", () => {
    localStorage.setItem("bad", "{not json")
    const { result } = renderHook(() => useLocalStorage("bad", 7))
    expect(result.current[0]).toBe(7)
  })
  it("a value that fails the validator falls back too", () => {
    localStorage.setItem("shape", JSON.stringify({ sort: 1 }))
    const isStr = (v: unknown): v is string => typeof v === "string"
    const { result } = renderHook(() => useLocalStorage("shape", "x", isStr))
    expect(result.current[0]).toBe("x")
  })
  it("a storage event from ANOTHER tab updates the value", () => {
    const { result } = renderHook(() => useLocalStorage("tab", "a"))
    act(() => {
      localStorage.setItem("tab", JSON.stringify("from-other-tab"))
      window.dispatchEvent(new StorageEvent("storage", { key: "tab" }))
    })
    expect(result.current[0]).toBe("from-other-tab")
  })
  it("ignores storage events for other keys", () => {
    const { result } = renderHook(() => useLocalStorage("mine", "a"))
    act(() => {
      localStorage.setItem("other", '"z"')
      window.dispatchEvent(new StorageEvent("storage", { key: "other" }))
    })
    expect(result.current[0]).toBe("a")
  })
  it("storage that throws (private mode) falls back to memory", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError")
    })
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError")
    })
    const { result } = renderHook(() => useLocalStorage("mem", 1))
    act(() => result.current[1](5))
    expect(result.current[0]).toBe(5)
  })
  it("setValue accepts an updater and reads the latest stored value", () => {
    const { result } = renderHook(() => useLocalStorage("count", 0))
    act(() => {
      result.current[1]((n) => n + 1)
      result.current[1]((n) => n + 1)
    })
    expect(result.current[0]).toBe(2)
  })
})

describe("useMediaQuery", () => {
  it("follows the media query live", () => {
    let matches = false
    let listener: () => void = () => {}
    vi.spyOn(window, "matchMedia").mockImplementation(
      () =>
        ({
          get matches() {
            return matches
          },
          addEventListener: (_: string, l: () => void) => (listener = l),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList
    )
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"))
    expect(result.current).toBe(false)
    act(() => {
      matches = true
      listener()
    })
    expect(result.current).toBe(true)
  })
  it("removes its listener on unmount", () => {
    const remove = vi.fn()
    vi.spyOn(window, "matchMedia").mockImplementation(
      () =>
        ({
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: remove,
        }) as unknown as MediaQueryList
    )
    renderHook(() => useMediaQuery("(x)")).unmount()
    expect(remove).toHaveBeenCalled()
  })
})
