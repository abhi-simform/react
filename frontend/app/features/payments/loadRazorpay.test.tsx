import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const tags = () =>
  document.querySelectorAll<HTMLScriptElement>(
    'script[data-razorpay="checkout"]'
  )
const defineGlobal = () =>
  ((window as unknown as { Razorpay: unknown }).Razorpay = class {})

// The loader keeps its single-flight promise at module level: a fresh module per test.
let loadRazorpay: typeof import("./loadRazorpay").loadRazorpay
let razorpayScriptCount: typeof import("./loadRazorpay").razorpayScriptCount
let useRazorpay: typeof import("./useRazorpay").useRazorpay
beforeEach(async () => {
  vi.resetModules()
  ;({ loadRazorpay, razorpayScriptCount } = await import("./loadRazorpay"))
  ;({ useRazorpay } = await import("./useRazorpay"))
})

afterEach(() => {
  delete (window as { Razorpay?: unknown }).Razorpay
  tags().forEach((t) => t.remove())
})

describe("Razorpay script loader (the real checkout is never loaded in tests)", () => {
  it("many callers share ONE script tag", async () => {
    const calls = [loadRazorpay(), loadRazorpay(), loadRazorpay()]
    expect(razorpayScriptCount()).toBe(1)
    expect(tags()[0]?.src).toBe("https://checkout.razorpay.com/v1/checkout.js")
    defineGlobal() // the script "executes", then onload fires
    tags()[0]!.onload?.(new Event("load"))
    await Promise.all(calls)
    expect(razorpayScriptCount()).toBe(1)
  })

  it("a failed load removes the dead tag and the next call tries again", async () => {
    const first = loadRazorpay()
    tags()[0]!.onerror?.(new Event("error"))
    await expect(first).rejects.toThrow(/Could not load/)
    expect(razorpayScriptCount()).toBe(0)
    const retry = loadRazorpay()
    expect(razorpayScriptCount()).toBe(1)
    defineGlobal()
    tags()[0]!.onload?.(new Event("load"))
    await retry
  })

  it("loaded but no global: rejects and can be retried", async () => {
    const p = loadRazorpay()
    tags()[0]!.onload?.(new Event("load"))
    await expect(p).rejects.toThrow(/did not initialise/)
  })

  it("resolves immediately when the global already exists", async () => {
    defineGlobal()
    await loadRazorpay()
    expect(razorpayScriptCount()).toBe(0)
  })

  it("useRazorpay: a load failure rejects open() and sets `error`", async () => {
    const { result } = renderHook(() => useRazorpay())
    expect(result.current.ready).toBe(false)
    let rejected: unknown
    await act(async () => {
      const opening = result.current
        .open({} as never, () => {})
        .catch((e: unknown) => (rejected = e))
      tags()[0]!.onerror?.(new Event("error"))
      await opening
    })
    expect(rejected).toBeInstanceOf(Error)
    expect(result.current.error).toMatch(/Could not load/)
  })
})
