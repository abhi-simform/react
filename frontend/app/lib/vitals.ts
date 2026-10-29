import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals"

import { env } from "@/lib/env"
import { recordVital } from "@/lib/observability"

/**
 * Field data (13.1): the Core Web Vitals of REAL page views. `web-vitals` wraps the browser's
 * PerformanceObserver entries and applies Google's definitions (LCP = last candidate before the
 * first input, CLS = worst session window, INP = a high percentile of all interactions).
 *
 * - dev: logged to the console, so you see a number the moment you interact.
 * - production: one `navigator.sendBeacon` per metric to `POST /metrics/vitals`. A beacon survives
 *   the page being closed (CLS/INP are only final then), costs nothing to the user and is not
 *   cancelled by navigation, unlike `fetch`.
 */
export type VitalsPayload = {
  name: "LCP" | "INP" | "CLS" | "FCP" | "TTFB"
  value: number
  rating: "good" | "needs-improvement" | "poor"
  path: string
  connection?: string
  nav?: string
  ua: "mobile" | "desktop"
}

type Env = {
  pathname: string
  connection?: string
  mobile: boolean
}

/** Pure: a web-vitals `Metric` plus where/how it was measured -> the API body. Tested without a browser. */
export function toVitalsPayload(metric: Metric, where: Env): VitalsPayload {
  return {
    name: metric.name as VitalsPayload["name"],
    // CLS is a unitless score (keep 4 decimals), the others are milliseconds (whole).
    value:
      metric.name === "CLS"
        ? Math.round(metric.value * 10_000) / 10_000
        : Math.round(metric.value),
    rating: metric.rating,
    // Path ONLY: a reset-password link carries a token in its query string.
    path: where.pathname,
    connection: where.connection,
    nav: metric.navigationType,
    ua: where.mobile ? "mobile" : "desktop",
  }
}

function currentEnv(): Env {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string }
  }
  return {
    pathname: location.pathname,
    connection: nav.connection?.effectiveType,
    mobile: matchMedia("(pointer: coarse) and (max-width: 820px)").matches,
  }
}

function send(metric: Metric) {
  const payload = toVitalsPayload(metric, currentEnv())
  recordVital(payload) // 14.6: also a Sentry breadcrumb + metric (a no-op without a DSN)
  if (env.DEV) {
    console.info(
      `[vitals] ${payload.name} ${payload.value}${payload.name === "CLS" ? "" : " ms"} (${payload.rating}) ${payload.path}`
    )
    return
  }
  const body = new Blob([JSON.stringify(payload)], { type: "application/json" })
  // sendBeacon returns false when the browser refuses it (queue full): fall back to a keepalive fetch.
  if (!navigator.sendBeacon?.(`${env.VITE_API_URL}/metrics/vitals`, body))
    void fetch(`${env.VITE_API_URL}/metrics/vitals`, {
      method: "POST",
      body,
      keepalive: true,
    }).catch(() => undefined)
}

let installed = false
/** Idempotent (StrictMode runs effects twice; web-vitals has no unsubscribe). */
export function reportWebVitals() {
  if (installed || typeof window === "undefined") return
  installed = true
  for (const observe of [onLCP, onINP, onCLS, onFCP, onTTFB]) observe(send)
}
