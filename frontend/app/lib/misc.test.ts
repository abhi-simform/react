import { afterEach, describe, expect, it, vi } from "vitest"

import { abortable, isAbortError, sleep, withTimeout } from "./async"
import { ApiError, ContractError, toApiError } from "./api/errors"
import { toQueryString } from "./api/query"
import { imageFileProblem, imageFilesSchema, MAX_IMAGES } from "./imageFiles"
import { pageTitle } from "./pageTitle"
import { INDIA_STATES, isIndiaState } from "./indiaStates"
import { renderState } from "./asyncState"
import {
  describeCouponError,
  describeCouponReason,
} from "@/features/cart/coupon"
import { describeEta } from "@/features/delivery/format"
import {
  parseReviewFilter,
  withReviewFilter,
} from "@/features/product/reviewFilters"
import { clearAttemptKey, getAttemptKey } from "@/features/orders/idempotency"
import { groupBy } from "./groupBy"
import { deepFreeze, toggle } from "./immutable"

afterEach(() => vi.useRealTimers())

describe("async helpers (fake timers, no real waiting)", () => {
  it("sleep resolves after the delay only", async () => {
    vi.useFakeTimers()
    const done = vi.fn()
    void sleep(500).then(done)
    await vi.advanceTimersByTimeAsync(499)
    expect(done).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(done).toHaveBeenCalled()
  })
  it("abortable rejects on abort and clears its timer", async () => {
    vi.useFakeTimers()
    const c = new AbortController()
    const p = abortable(1000, c.signal)
    c.abort(new Error("stop"))
    await expect(p).rejects.toThrow("stop")
    expect(vi.getTimerCount()).toBe(0)
    await expect(abortable(10, c.signal)).rejects.toThrow("stop")
  })
  it("withTimeout aborts the work's signal at the deadline", async () => {
    vi.useFakeTimers()
    let seen: AbortSignal | undefined
    const p = withTimeout(
      (s) => ((seen = s), new Promise<string>(() => {})),
      100
    )
    const assertion = expect(p).rejects.toBeDefined()
    await vi.advanceTimersByTimeAsync(100)
    await assertion
    expect(seen?.aborted).toBe(true)
  })
  it("withTimeout passes the result through and clears the timer", async () => {
    vi.useFakeTimers()
    await expect(withTimeout(async () => 7, 100)).resolves.toBe(7)
    expect(vi.getTimerCount()).toBe(0)
  })
  it("isAbortError", () => {
    expect(isAbortError(new DOMException("x", "AbortError"))).toBe(true)
    expect(isAbortError(new Error("x"))).toBe(false)
    expect(isAbortError("AbortError")).toBe(false)
  })
})

describe("errors", () => {
  it("fieldErrors keeps the FIRST message per path and ignores junk", () => {
    const e = new ApiError({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "m",
      details: [
        { path: "pincode", message: "bad" },
        { path: "pincode", message: "later" },
        { path: 1 },
        null,
        "x",
      ],
    })
    expect(e.fieldErrors).toEqual({ pincode: "bad" })
    expect(e.isValidation).toBe(true)
    expect(
      new ApiError({ status: 422, code: "X", message: "m", details: "nope" })
        .fieldErrors
    ).toEqual({})
  })
  it("flags network and timeout", () => {
    expect(
      new ApiError({ status: 0, code: "NETWORK_ERROR", message: "" }).isNetwork
    ).toBe(true)
    expect(
      new ApiError({ status: 0, code: "TIMEOUT", message: "" }).isTimeout
    ).toBe(true)
  })
  it("toApiError wraps anything", () => {
    const api = new ApiError({ status: 404, code: "NOT_FOUND", message: "x" })
    expect(toApiError(api)).toBe(api)
    expect(
      toApiError(
        new ContractError("GET /x", [
          { path: ["data", 0, "name"], message: "Required" },
        ])
      )
    ).toMatchObject({ code: "CONTRACT_ERROR" })
    expect(toApiError("boom")).toMatchObject({
      code: "NETWORK_ERROR",
      status: 0,
    })
    expect(new ContractError("r", []).path).toBe("(root)")
  })
})

describe("toQueryString", () => {
  it("drops undefined/empty, joins arrays, encodes", () => {
    expect(
      toQueryString({
        a: 1,
        b: undefined,
        c: "",
        d: ["x", "y"],
        e: [],
        f: false,
        g: "a b&c",
      })
    ).toBe("?a=1&d=x%2Cy&f=false&g=a+b%26c")
    expect(toQueryString({})).toBe("")
  })
})

describe("image files", () => {
  const file = (name: string, type: string, size = 10) =>
    new File([new Uint8Array(size)], name, { type })
  it.each([
    [file("a.png", "image/png"), null],
    [
      file("a.gif", "image/gif"),
      "a.gif: only JPEG, PNG or WebP images are accepted",
    ],
    [
      file("big.jpg", "image/jpeg", 3 * 1024 * 1024),
      "big.jpg is 3.0 MB; the limit is 2.0 MB",
    ],
  ])("imageFileProblem %#", (f, problem) =>
    expect(imageFileProblem(f)).toBe(problem)
  )
  it("at most five", () => {
    const six = Array.from({ length: MAX_IMAGES + 1 }, () =>
      file("a.png", "image/png")
    )
    expect(imageFilesSchema.safeParse(six).success).toBe(false)
    expect(imageFileProblem("x" as unknown as File)).toBe(
      "Choose an image file"
    )
  })
})

describe("small pure helpers", () => {
  it("pageTitle", () => {
    expect(pageTitle()).toBe("ShopSphere")
    expect(pageTitle("Cart")).toBe("Cart | ShopSphere")
  })
  it("isIndiaState", () => {
    expect(isIndiaState(INDIA_STATES[0])).toBe(true)
    expect(isIndiaState("Atlantis")).toBe(false)
  })
  it("renderState covers every state", () => {
    const err = new ApiError({ status: 500, code: "X", message: "bad" })
    expect(renderState({ status: "idle" }, String)).toMatch(/Nothing/)
    expect(renderState({ status: "loading" }, String)).toBe("Loading...")
    expect(renderState({ status: "success", data: 3 }, (n) => `n=${n}`)).toBe(
      "n=3"
    )
    expect(renderState({ status: "error", error: err }, String)).toBe(
      "Error X: bad"
    )
  })
  it("groupBy / toggle / deepFreeze", () => {
    expect(groupBy([1, 2, 3, 4], (n) => (n % 2 ? "odd" : "even"))).toEqual({
      odd: [1, 3],
      even: [2, 4],
    })
    const s = new Set([1])
    expect([...toggle(s, 2)]).toEqual([1, 2])
    expect([...toggle(s, 1)]).toEqual([])
    expect(s.size).toBe(1)
    const frozen = deepFreeze({ a: { b: [1] } })
    expect(Object.isFrozen(frozen.a.b)).toBe(true)
  })
})

describe("coupon copy: never a raw code", () => {
  it.each([
    "UNKNOWN",
    "NOT_STARTED",
    "EXPIRED",
    "ALREADY_USED",
    "NOT_APPLICABLE",
    "EXHAUSTED",
    "FIRST_ORDER_ONLY",
    "EMPTY_CART",
    "SOMETHING_NEW",
    "",
  ])("reason %j is a sentence", (reason) => {
    const text = describeCouponReason(reason, "SAVE10")
    expect(text.length).toBeGreaterThan(10)
    expect(text).not.toBe(reason)
  })
  it("MIN_ORDER mentions the amounts when given", () => {
    expect(
      describeCouponReason("MIN_ORDER", "S", { minOrder: 999, shortBy: 100 })
    ).toMatch(/999.*100/)
    expect(describeCouponReason("MIN_ORDER", "S")).toBe(
      "S needs a bigger cart."
    )
  })
  it("describeCouponError by error kind", () => {
    const e = (status: number, code: string, details?: unknown) =>
      new ApiError({ status, code, message: "m", details })
    expect(
      describeCouponError(e(422, "COUPON_INVALID", { reason: "EXPIRED" }), "A")
    ).toBe("A has expired.")
    expect(describeCouponError(e(401, "UNAUTHORIZED"), "A")).toMatch(/Sign in/)
    expect(describeCouponError(e(0, "NETWORK_ERROR"), "A")).toBe("m")
    expect(describeCouponError(e(500, "X"), "A")).toMatch(/could not apply/)
  })
})

describe("delivery ETA / review filters / idempotency key", () => {
  it("describeEta", () => {
    const base = {
      deliveryDays: { min: 1, max: 2 },
      estimatedDelivery: {
        from: "2026-10-29T00:00:00Z",
        to: "2026-10-30T00:00:00Z",
      },
    }
    expect(describeEta(base as never)).toMatch(
      /^Delivery in 1-2 days \(.* to .*\)$/
    )
    expect(
      describeEta({
        ...base,
        deliveryDays: { min: 3, max: 3 },
        estimatedDelivery: {
          from: base.estimatedDelivery.from,
          to: base.estimatedDelivery.from,
        },
      } as never)
    ).toMatch(/^Delivery in 3 days \([^)]*\)$/)
    expect(
      describeEta({ ...base, deliveryDays: { min: 1, max: 1 } } as never)
    ).toMatch(/1 day /)
  })
  it("parseReviewFilter is defensive", () => {
    expect(
      parseReviewFilter(new URLSearchParams("reviews=9&rsort=zzz"))
    ).toEqual({ rating: undefined, sort: "helpful", photos: false })
    expect(
      parseReviewFilter(new URLSearchParams("reviews=4&rsort=newest&rphotos=1"))
    ).toEqual({ rating: 4, sort: "newest", photos: true })
  })
  it("withReviewFilter keeps other params and drops defaults", () => {
    const out = withReviewFilter(
      new URLSearchParams("tab=reviews&reviews=3&rsort=newest"),
      { rating: undefined, sort: "helpful" }
    )
    expect(out.toString()).toBe("tab=reviews")
  })
  it("the order attempt key is stable per user until cleared", () => {
    const k = getAttemptKey("u1")
    expect(getAttemptKey("u1")).toBe(k)
    expect(getAttemptKey("u2")).not.toBe(k)
    clearAttemptKey("u1")
    expect(getAttemptKey("u1")).not.toBe(k)
  })
  it("storage that throws does not break it", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    expect(getAttemptKey("u1")).toBeTruthy()
    expect(() => clearAttemptKey("u1")).not.toThrow()
  })
})
