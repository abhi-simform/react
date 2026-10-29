import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const send = {
  exception: vi.fn(),
  user: vi.fn(),
  vital: vi.fn(),
}
const start = vi.fn()

async function load(dsn: string) {
  vi.resetModules()
  vi.doMock("@/lib/env", () => ({
    env: { SENTRY_DSN: dsn, DEV: false, VITE_API_URL: "http://x" },
  }))
  vi.doMock("@/lib/sentry", () => ({ start, send }))
  const obs = await import("./observability")
  const { ApiError } = await import("./api/errors")
  const { reportError } = await import("./report")
  return { obs, ApiError, reportError }
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined)
  start.mockClear()
  send.exception.mockClear()
  send.user.mockClear()
  send.vital.mockClear()
})
afterEach(() => vi.restoreAllMocks())

describe("without a DSN", () => {
  it("is a complete no-op: the SDK is never started or even loaded, the console still gets the error", async () => {
    const { obs, reportError } = await load("")
    reportError(new Error("boom"), "test")
    obs.setReportUser("u1")
    await obs.initObservability()
    expect(console.error).toHaveBeenCalledWith("[test]", expect.any(Error))
    expect(start).not.toHaveBeenCalled()
    expect(send.exception).not.toHaveBeenCalled()
    expect(send.user).not.toHaveBeenCalled()
  })
})

describe("with a DSN", () => {
  it("queues what happens before the SDK is ready and flushes it in order", async () => {
    const { obs, reportError } = await load("https://key@o1.ingest.sentry.io/1")
    reportError(new Error("early"), "window.onerror")
    obs.setReportUser("u1")
    expect(send.exception).not.toHaveBeenCalled()
    await obs.initObservability()
    expect(start).toHaveBeenCalledTimes(1)
    expect(send.exception).toHaveBeenCalledWith(
      expect.any(Error),
      { context: "window.onerror" },
      undefined
    )
    expect(send.user).toHaveBeenCalledWith("u1")
    reportError(new Error("late"), "x")
    expect(send.exception).toHaveBeenCalledTimes(2)
  })

  it("starts the SDK once however often it is asked", async () => {
    const { obs } = await load("https://key@o1.ingest.sentry.io/1")
    await Promise.all([obs.initObservability(), obs.initObservability()])
    await obs.initObservability()
    expect(start).toHaveBeenCalledTimes(1)
  })

  it("tags an API failure with the request id that is in the backend log", async () => {
    const { obs, ApiError, reportError } = await load(
      "https://key@o1.ingest.sentry.io/1"
    )
    await obs.initObservability()
    reportError(
      new ApiError({
        status: 500,
        code: "INTERNAL",
        message: "HTTP 500: nope",
        requestId: "req-42",
      }),
      "route error boundary"
    )
    expect(send.exception).toHaveBeenCalledWith(
      expect.any(ApiError),
      {
        context: "route error boundary",
        api_status: "500",
        api_code: "INTERNAL",
        request_id: "req-42",
      },
      undefined
    )
  })

  it("passes the component stack from a boundary as extra", async () => {
    const { obs, reportError } = await load("https://key@o1.ingest.sentry.io/1")
    await obs.initObservability()
    reportError(new Error("render"), "boundary:rail", {
      componentStack: "at Rail",
    })
    expect(send.exception).toHaveBeenCalledWith(
      expect.any(Error),
      { context: "boundary:rail" },
      { componentStack: "at Rail" }
    )
  })

  it("a failing SDK load never throws into the app", async () => {
    vi.resetModules()
    vi.doMock("@/lib/env", () => ({
      env: {
        SENTRY_DSN: "https://k@o.ingest.sentry.io/1",
        DEV: false,
        VITE_API_URL: "http://x",
      },
    }))
    vi.doMock("@/lib/sentry", () => {
      throw new Error("blocked by an ad blocker")
    })
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const obs = await import("./observability")
    await expect(obs.initObservability()).resolves.toBeUndefined()
    expect(() => obs.setReportUser("u1")).not.toThrow()
  })
})
