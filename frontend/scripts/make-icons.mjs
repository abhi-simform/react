// 13.10: renders the PWA icons (PNG) from an inline SVG with Playwright's Chromium. Run once, commit public/icons.
//   node scripts/make-icons.mjs
import { chromium } from "@playwright/test"

const BRAND = "#0f766e"
// "S" in a rounded tile. `maskable` = full-bleed square background with the glyph inside the 80% safe zone
// (launchers crop maskable icons to circles/squircles, so nothing important may sit near the edge).
const svg = (size, { maskable = false } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="${maskable ? 0 : 22}" fill="${BRAND}"/>
  <g transform="${maskable ? "translate(50 50) scale(0.72) translate(-50 -50)" : ""}">
    <circle cx="50" cy="50" r="30" fill="none" stroke="#fff" stroke-width="7" opacity="0.35"/>
    <text x="50" y="66" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="52" text-anchor="middle" fill="#fff">S</text>
  </g>
</svg>`

const targets = [
  ["public/icons/icon-192.png", 192, {}],
  ["public/icons/icon-512.png", 512, {}],
  ["public/icons/icon-maskable-512.png", 512, { maskable: true }],
  ["public/icons/apple-touch-icon.png", 180, { maskable: true }],
]
const browser = await chromium.launch()
const page = await browser.newPage()
for (const [file, size, opts] of targets) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<body style="margin:0;background:transparent">${svg(size, opts)}</body>`
  )
  await page.screenshot({
    path: file,
    omitBackground: true,
    clip: { x: 0, y: 0, width: size, height: size },
  })
  console.log("wrote", file)
}
await browser.close()
