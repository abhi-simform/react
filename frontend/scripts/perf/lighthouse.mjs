// 13.1: Lighthouse (lab data) for the four baseline pages, mobile (Lighthouse default: Moto G Power, slow 4G,
// 4x CPU, simulated throttling) and desktop. Not a dependency of the app (it is large): run it from a
// throwaway folder:
//   mkdir /tmp/lh && cd /tmp/lh && npm init -y && npm i lighthouse chrome-launcher
//   CHROME_PATH=<chrome binary> node <repo>/frontend/scripts/perf/lighthouse.mjs http://localhost:5173 <product-slug> out.json [mobile|desktop]
// Always against a PRODUCTION build (`npm run build && npm start`), never `vite dev`.
import lighthouse from "lighthouse"
import * as chromeLauncher from "chrome-launcher"
import fs from "node:fs"
const CHROME = process.env.CHROME_PATH // e.g. the Chromium Playwright installed: chromium.executablePath()
const [, , base, slug, outFile, ...which] = process.argv
const pages = {
  home: "/",
  listing: "/products",
  pdp: `/p/${slug}`,
  cart: "/cart",
}
const forms = which.length ? which : ["mobile", "desktop"]
const out = {}
for (const [name, path] of Object.entries(pages)) {
  for (const form of forms) {
    const chrome = await chromeLauncher.launch({
      chromePath: CHROME,
      chromeFlags: ["--headless=new", "--no-sandbox"],
    })
    const config =
      form === "desktop"
        ? {
            extends: "lighthouse:default",
            settings: {
              formFactor: "desktop",
              screenEmulation: {
                mobile: false,
                width: 1350,
                height: 940,
                deviceScaleFactor: 1,
                disabled: false,
              },
              throttling: {
                rttMs: 40,
                throughputKbps: 10240,
                cpuSlowdownMultiplier: 1,
              },
              onlyCategories: [
                "performance",
                "seo",
                "accessibility",
                "best-practices",
              ],
            },
          }
        : {
            extends: "lighthouse:default",
            settings: {
              onlyCategories: [
                "performance",
                "seo",
                "accessibility",
                "best-practices",
              ],
            },
          }
    const r = await lighthouse(
      base + path,
      { port: chrome.port, output: "json", logLevel: "error" },
      config
    )
    const a = r.lhr.audits,
      c = r.lhr.categories
    const findNode = (o) => {
      if (!o || typeof o !== "object") return null
      if (o.type === "node") return o
      for (const v of Object.values(o)) {
        const f = findNode(v)
        if (f) return f
      }
      return null
    }
    const lcpEl = findNode(a["lcp-breakdown-insight"]?.details)
    const bytes = a["network-requests"]?.details?.items ?? []
    const js = bytes.filter((i) => i.resourceType === "Script"),
      img = bytes.filter((i) => i.resourceType === "Image"),
      font = bytes.filter((i) => i.resourceType === "Font")
    const sum = (xs, k) =>
      Math.round(xs.reduce((s, i) => s + (i[k] || 0), 0) / 1024)
    out[`${name}-${form}`] = {
      perf: Math.round(c.performance.score * 100),
      a11y: Math.round(c.accessibility.score * 100),
      bp: Math.round(c["best-practices"].score * 100),
      seo: Math.round(c.seo.score * 100),
      fcp: Math.round(a["first-contentful-paint"].numericValue),
      lcp: Math.round(a["largest-contentful-paint"].numericValue),
      cls: +a["cumulative-layout-shift"].numericValue.toFixed(3),
      tbt: Math.round(a["total-blocking-time"].numericValue),
      si: Math.round(a["speed-index"].numericValue),
      lcpEl: lcpEl
        ? (lcpEl.snippet || lcpEl.selector || "")
            .replace(/ class="[^"]*"/, "")
            .slice(0, 130)
        : null,
      lcpParts: (a["lcp-breakdown-insight"]?.details?.items?.[0]?.items ?? [])
        .map((i) => Math.round(i.duration))
        .join("/"),
      shifts: (a["layout-shifts"]?.details?.items ?? [])
        .slice(0, 2)
        .map(
          (i) =>
            (i.node?.selector ?? "?").slice(0, 60) + "=" + (+i.score).toFixed(3)
        )
        .join(" | "),
      jsKB: sum(js, "transferSize"),
      imgKB: sum(img, "transferSize"),
      fontKB: sum(font, "transferSize"),
      totalKB: sum(bytes, "transferSize"),
      requests: bytes.length,
    }
    console.log(name, form, JSON.stringify(out[`${name}-${form}`]))
    await chrome.kill()
  }
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 2))
