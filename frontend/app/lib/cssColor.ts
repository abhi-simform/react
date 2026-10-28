/**
 * A design token as a plain `#rrggbb`, for third-party UI that cannot read our CSS variables
 * (the Razorpay modal wants a hex `theme.color`). The tokens are `oklch()` values; the browser
 * normalises any CSS colour through a canvas, which is the cheapest way to get sRGB bytes.
 * Falls back (no canvas, SSR, tests) to `fallback`.
 */
export function cssVarToHex(name: string, fallback: string): string {
  try {
    const probe = document.createElement("span")
    probe.style.color = `var(${name})`
    document.body.append(probe)
    const computed = getComputedStyle(probe).color
    probe.remove()
    const ctx = document.createElement("canvas").getContext("2d")
    if (!ctx || !computed) return fallback
    ctx.fillStyle = "#000"
    ctx.fillStyle = computed
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    if (a === 0) return fallback
    return `#${[r, g, b].map((v) => v!.toString(16).padStart(2, "0")).join("")}`
  } catch {
    return fallback
  }
}
