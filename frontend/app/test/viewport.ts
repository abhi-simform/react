import { vi } from "vitest"

/**
 * jsdom has no layout: every media query "does not match", so the app renders its PHONE layout.
 * `setViewport(1280)` makes `(min-width: Npx)` queries match like a desktop browser would.
 * (`restoreMocks` in the Vitest config undoes it after each test.)
 */
export function setViewport(width: number) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: matchesQuery(query, width),
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      }) as MediaQueryList
  )
}

function matchesQuery(query: string, width: number): boolean {
  const min = /\(min-width:\s*(\d+)px\)/.exec(query)
  if (min) return width >= Number(min[1])
  const max = /\(max-width:\s*(\d+)px\)/.exec(query)
  if (max) return width <= Number(max[1])
  return false
}
