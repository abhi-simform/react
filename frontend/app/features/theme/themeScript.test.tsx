import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { THEME_STORAGE_KEY, themeInitScript } from "./themeScript"

function run({ stored, osDark }: { stored?: string | null; osDark: boolean }) {
  localStorage.clear()
  if (stored !== undefined && stored !== null)
    localStorage.setItem(THEME_STORAGE_KEY, stored)
  vi.spyOn(window, "matchMedia").mockImplementation(
    (q: string) =>
      ({ matches: osDark && q.includes("dark"), media: q }) as MediaQueryList
  )
  // The script is plain JS in a string: evaluate it the way the browser would.
  new Function(themeInitScript)()
  return {
    dark: document.documentElement.classList.contains("dark"),
    scheme: document.documentElement.style.colorScheme,
  }
}

describe("themeInitScript (no flash of the wrong theme)", () => {
  beforeEach(() => {
    document.documentElement.className = ""
    document.documentElement.style.colorScheme = ""
  })
  afterEach(() => localStorage.clear())

  it("a stored dark choice wins over a light OS", () => {
    expect(run({ stored: '"dark"', osDark: false })).toEqual({
      dark: true,
      scheme: "dark",
    })
  })
  it("a stored light choice wins over a dark OS", () => {
    expect(run({ stored: '"light"', osDark: true })).toEqual({
      dark: false,
      scheme: "light",
    })
  })
  it("`system` and no choice at all follow the OS", () => {
    expect(run({ stored: '"system"', osDark: true }).dark).toBe(true)
    expect(run({ stored: '"system"', osDark: false }).dark).toBe(false)
    expect(run({ osDark: true }).dark).toBe(true)
  })
  it("a corrupt stored value never throws and falls back to the OS", () => {
    expect(run({ stored: "{not json", osDark: true }).dark).toBe(true)
  })
  it("storage that throws (private mode) is survived", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    expect(() => new Function(themeInitScript)()).not.toThrow()
  })
  it("its CSP hash comes from the build (14.1), not from a pasted value that can go stale", () => {
    // public/_headers holds a placeholder; scripts/build-headers.mjs hashes every inline script of the built HTML.
    expect(readFileSync("public/_headers", "utf8")).toContain(
      "__SCRIPT_HASHES__"
    )
    // And the build's own output (when one exists) lists this script's hash.
    const built = existsSync("build/client/_headers")
      ? readFileSync("build/client/_headers", "utf8")
      : null
    if (built) {
      const hash = createHash("sha256").update(themeInitScript).digest("base64")
      expect(built).toContain(`'sha256-${hash}'`)
    }
  })
})
