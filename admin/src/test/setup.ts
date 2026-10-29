import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, expect } from "vitest"
import * as axeMatchers from "vitest-axe/matchers"

import { server } from "./server"

expect.extend(axeMatchers)

// jsdom lacks these browser APIs that base-ui / Recharts / dnd-kit touch.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.assign(globalThis, { ResizeObserver: ResizeObserverStub })
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  }),
})
Element.prototype.scrollIntoView = () => {}
// axe probes canvas for colour contrast; jsdom has no canvas: say so quietly instead of logging an error.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext

beforeAll(() =>
  // MSW 3 renamed `onUnhandledRequest` to `onUnhandledFrame` (a "frame" is a request or a WebSocket connection).
  server.listen({ onUnhandledFrame: "error" })
)
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
