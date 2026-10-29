import { readFileSync } from "node:fs"
import os from "node:os"
import mongoose from "mongoose"
import { Router } from "express"
import { isDbReady } from "../../config/db.js"
import { env, isProd, paymentMock, redisEnabled } from "../../config/env.js"
import { getRedis } from "../../config/redis.js"
import { jobDriver } from "../../jobs/index.js"
import { memoryStats } from "../../jobs/queue.js"
import { authenticate, authorize } from "../../middleware/auth.js"
import { valid, validate } from "../../middleware/validate.js"
import { ok } from "../../utils/response.js"
import { stats as cacheStats } from "../../utils/cache.js"
import { RETURN_WINDOW_DAYS } from "../orders/order.model.js"
import { FREE_SHIPPING_ABOVE, SHIPPING_FEE } from "../pricing/pricing.js"
import { auditChange } from "../audit/audit.service.js"
import { getSettings, updateSettings, updateSettingsSchema } from "./settings.service.js"

const version = (() => {
  try {
    return (
      JSON.parse(
        readFileSync(new URL("../../../package.json", import.meta.url), "utf8")
      ) as {
        version: string
      }
    ).version
  } catch {
    return "unknown"
  }
})()

type Check = {
  name: string
  status: "ok" | "down" | "disabled"
  detail: string
  latencyMs?: number
}

async function timed(name: string, fn: () => Promise<string>): Promise<Check> {
  const t = Date.now()
  try {
    return { name, status: "ok", detail: await fn(), latencyMs: Date.now() - t }
  } catch (err) {
    return { name, status: "down", detail: (err as Error).message.slice(0, 120) }
  }
}

export const adminSystemRoutes = Router()
adminSystemRoutes.use(authenticate, authorize("admin"))

/** Dependencies and process facts for the admin "System health" screen. Never exposes a secret value. */
adminSystemRoutes.get("/health", async (_req, res) => {
  const checks: Check[] = [
    await timed("MongoDB", async () => {
      if (!isDbReady()) throw new Error("not connected")
      await mongoose.connection.db!.admin().ping()
      return `connected to ${mongoose.connection.name}`
    }),
    redisEnabled
      ? await timed("Redis", async () => {
          const r = getRedis()
          if (!r) throw new Error("client missing")
          await r.ping()
          return "cache, rate limits and job queue"
        })
      : {
          name: "Redis",
          status: "disabled",
          detail: "REDIS_URL not set: cache, rate limits and jobs run in-process",
        },
    {
      name: "Payments",
      status: "ok",
      detail: paymentMock ? "mock gateway (no Razorpay keys)" : "Razorpay",
    },
    {
      name: "Email",
      status: "ok",
      detail: `SMTP ${env.SMTP_HOST}:${env.SMTP_PORT}`,
    },
    {
      name: "Background jobs",
      status: env.JOBS_ENABLED ? "ok" : "disabled",
      detail: env.JOBS_ENABLED
        ? `${jobDriver()} driver, ${memoryStats.completed} done / ${memoryStats.failed} failed since boot`
        : "JOBS_ENABLED=false",
    },
  ]
  const mem = process.memoryUsage()
  ok(res, {
    status: checks.some((c) => c.status === "down") ? "degraded" : "ok",
    checkedAt: new Date().toISOString(),
    checks,
    process: {
      version,
      node: process.version,
      env: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      rssMb: Math.round(mem.rss / 1_048_576),
      heapUsedMb: Math.round(mem.heapUsed / 1_048_576),
      cpus: os.cpus().length,
    },
    cache: { enabled: env.CACHE_ENABLED, ...cacheStats },
  })
})

adminSystemRoutes.get("/settings", async (_req, res) => {
  ok(res, {
    editable: await getSettings(),
    // Read-only: set by environment or code, shown so an admin can see what the platform runs with.
    readOnly: {
      currency: "INR",
      returnWindowDays: RETURN_WINDOW_DAYS,
      freeShippingAbove: FREE_SHIPPING_ABOVE,
      shippingFee: SHIPPING_FEE,
      orderExpiryMinutes: env.ORDER_EXPIRY_MINUTES,
      uploadMaxBytes: env.UPLOAD_MAX_BYTES,
      corsOrigins: env.CORS_ORIGINS,
      production: isProd,
    },
  })
})
adminSystemRoutes.patch("/settings", validate(updateSettingsSchema), async (req, res) => {
  const { body } = valid<typeof updateSettingsSchema>(req)
  const before = await getSettings()
  const after = await updateSettings(body)
  ok(res, auditChange(res, before, after, Object.keys(before)))
})
