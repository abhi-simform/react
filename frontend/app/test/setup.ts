import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { afterAll, afterEach, beforeAll } from "vitest"

import { clearAccessToken } from "@/features/auth/session"
import { resetDb } from "@/test/msw/db"
import { server } from "@/test/msw/server"

// jsdom has no layout engine or IntersectionObserver: the minimum the app needs.
if (!("IntersectionObserver" in globalThis)) {
  class FakeIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  Object.defineProperty(globalThis, "IntersectionObserver", {
    value: FakeIntersectionObserver,
  })
}
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
Element.prototype.scrollIntoView ??= () => {}
// Sonner's swipe-to-dismiss and base-ui use pointer capture; jsdom has none.
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.hasPointerCapture ??= () => false

// 12.4: an unmocked request fails the test loudly instead of reaching the network.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetDb()
  clearAccessToken()
  localStorage.clear()
  sessionStorage.clear()
})
afterAll(() => server.close())
