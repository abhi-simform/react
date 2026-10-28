import { expect, test } from "./support/fixtures"

/**
 * 12.9: WCAG contrast of the theme tokens, light and dark. The browser resolves each `oklch()`
 * token to sRGB (a probe element's computed colour), then the WCAG 2.x ratio is computed.
 * Text pairs need 4.5:1; the focus ring against the background needs 3:1 (non-text, 1.4.11).
 */
const PAIRS: [fg: string, bg: string, min: number][] = [
  ["--foreground", "--background", 4.5],
  ["--card-foreground", "--card", 4.5],
  ["--popover-foreground", "--popover", 4.5],
  ["--primary-foreground", "--primary", 4.5],
  ["--secondary-foreground", "--secondary", 4.5],
  ["--accent-foreground", "--accent", 4.5],
  ["--muted-foreground", "--background", 4.5],
  ["--muted-foreground", "--muted", 4.5],
  ["--destructive", "--background", 4.5],
  ["--ring", "--background", 3],
]

for (const scheme of ["light", "dark"] as const) {
  test(`token contrast, ${scheme} theme`, async ({ page }) => {
    await page.goto("/login")
    await page.evaluate(
      (s) => document.documentElement.classList.toggle("dark", s === "dark"),
      scheme
    )
    const results = await page.evaluate((pairs) => {
      const rgb = (token: string) => {
        const probe = document.createElement("span")
        probe.style.color = `var(${token})`
        document.body.append(probe)
        const canvas = document.createElement("canvas").getContext("2d")!
        canvas.fillStyle = "#fff"
        canvas.fillStyle = getComputedStyle(probe).color // oklch() -> normalised by the canvas
        canvas.fillRect(0, 0, 1, 1)
        const [r, g, b, a] = canvas.getImageData(0, 0, 1, 1).data
        probe.remove()
        return [r!, g!, b!, a!] as const
      }
      const lum = ([r, g, b]: readonly number[]) => {
        const f = (v: number) => {
          const c = v / 255
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
        }
        return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!)
      }
      return pairs.map(([fg, bg, min]) => {
        const a = lum(rgb(fg)),
          b = lum(rgb(bg))
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
        return {
          pair: `${fg} on ${bg}`,
          ratio: Math.round(ratio * 100) / 100,
          min,
        }
      })
    }, PAIRS)
    console.log(`contrast ${scheme}`, JSON.stringify(results))
    const failing = results.filter((r) => r.ratio < r.min)
    expect(failing, `pairs below their minimum in the ${scheme} theme`).toEqual(
      []
    )
  })
}
