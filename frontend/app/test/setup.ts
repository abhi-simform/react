import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { afterAll, afterEach, beforeAll } from "vitest"

import { clearAccessToken } from "@/features/auth/session"
import { resetDb } from "@/test/msw/db"
import { server } from "@/test/msw/server"
import { recordUnhandled, takeUnhandled } from "@/test/msw/unhandled"

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
Element.prototype.scrollTo ??= () => {}
Element.prototype.scrollBy ??= () => {}
window.scrollTo = () => {}
// Sonner's swipe-to-dismiss and base-ui use pointer capture; jsdom has none.
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.hasPointerCapture ??= () => false

// 12.4: an unmocked request fails the test loudly instead of reaching the network.
// `onUnhandledRequest: "error"` rejects the request, but the app may swallow that rejection (a
// query just shows an error state). So every unhandled request is also recorded, and the test
// that caused it FAILS in afterEach, naming the URL.
beforeAll(() => {
  server.listen({
    onUnhandledRequest(request, print) {
      recordUnhandled(`${request.method} ${request.url}`)
      print.error()
    },
  })
})
afterEach(() => {
  const missed = takeUnhandled()
  if (missed.length > 0)
    throw new Error(`Unmocked network request(s):\n  ${missed.join("\n  ")}`)
  cleanup()
  server.resetHandlers()
  resetDb()
  clearAccessToken()
  localStorage.clear()
  sessionStorage.clear()
})
afterAll(() => server.close())
