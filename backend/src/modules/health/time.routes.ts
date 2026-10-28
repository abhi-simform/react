import { Router } from "express"
import { ok } from "../../utils/response.js"

// The server clock is the authority for countdowns (flash sales, coupon expiry). Clients call
// this, compare with their own clock and keep the OFFSET. No caching: it must be "now".
export const timeRoutes = Router()
timeRoutes.get("/", (_req, res) => {
  res.setHeader("Cache-Control", "no-store")
  const now = new Date()
  ok(res, { now: now.toISOString(), epochMs: now.getTime() })
})
