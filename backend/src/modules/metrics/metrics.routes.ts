import { Router } from "express"
import { z } from "zod"
import { authenticate, authorize } from "../../middleware/auth.js"
import { metricsLimiter } from "../../middleware/rateLimit.js"
import { valid, validate } from "../../middleware/validate.js"
import { noContent, ok } from "../../utils/response.js"
import { WebVital } from "./metrics.model.js"

const vitalSchema = {
  body: z.object({
    name: z.enum(["LCP", "INP", "CLS", "FCP", "TTFB"]),
    value: z.number().finite().min(0).max(1_000_000),
    rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
    // Path only: never a query string (it can carry emails/tokens in reset links).
    path: z
      .string()
      .max(200)
      .startsWith("/")
      .regex(/^[^?#\s]*$/, "Path only, no query"),
    connection: z.string().max(20).optional(),
    nav: z.string().max(30).optional(),
    ua: z.enum(["mobile", "desktop"]).optional(),
  }),
}

// Public by design (anonymous visitors report too): validated, size-capped, rate limited.
export const metricsRoutes = Router()
metricsRoutes.post("/vitals", metricsLimiter, validate(vitalSchema), async (req, res) => {
  const { body } = valid<typeof vitalSchema>(req)
  await WebVital.create(body)
  noContent(res)
})

// Admin: p75 per metric and path over the last N days (p75 is the percentile Google judges).
export const adminMetricsRoutes = Router()
adminMetricsRoutes.use(authenticate, authorize("admin"))
adminMetricsRoutes.get("/vitals", async (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 7))
  const rows = await WebVital.find({
    createdAt: { $gte: new Date(Date.now() - days * 86_400_000) },
  })
    .select("name path value")
    .lean()
  const groups = new Map<string, number[]>()
  for (const r of rows) {
    const k = `${r.name}|${r.path}`
    ;(groups.get(k) ?? groups.set(k, []).get(k)!).push(r.value)
  }
  ok(
    res,
    [...groups].map(([k, values]) => {
      const [name, path] = k.split("|")
      values.sort((a, b) => a - b)
      const p75 =
        values[Math.min(values.length - 1, Math.ceil(values.length * 0.75) - 1)]!
      return { name, path, samples: values.length, p75 }
    })
  )
})
