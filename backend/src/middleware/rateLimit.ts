import type { Request, RequestHandler } from "express"
import { ipKeyGenerator, rateLimit } from "express-rate-limit"
import { isTest } from "../config/env.js"
import { getRedis } from "../config/redis.js"
import { RedisRateLimitStore } from "./rateLimitStore.js"

/**
 * One limiter per purpose. The store is Redis when REDIS_URL is set (shared by every instance),
 * otherwise express-rate-limit's built-in in-memory store. `keyBy: "user"` counts a signed-in
 * client by account instead of by IP (a whole office behind one NAT is not one client), and falls
 * back to the IP for anonymous requests.
 */
const limiter = (
  name: string,
  windowMs: number,
  limit: number,
  code: string,
  keyBy: "ip" | "user" = "ip"
) => {
  const redis = getRedis()
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => isTest,
    ...(redis ? { store: new RedisRateLimitStore(redis, `rl:${name}`) } : {}),
    ...(keyBy === "user"
      ? {
          keyGenerator: (req: Request) =>
            req.user?.id ? `u:${req.user.id}` : ipKeyGenerator(req.ip ?? ""),
        }
      : {}),
    handler: (_req, res) =>
      res.status(429).json({
        success: false,
        error: { code, message: "Too many requests, slow down." },
      }),
  })
}

export const apiLimiter = limiter("api", 60_000, 300, "RATE_LIMITED")
// Credential endpoints: brute-force protection.
export const authLimiter = limiter("auth", 15 * 60_000, 30, "AUTH_RATE_LIMITED")
// Uploads are the most expensive thing a client can send: tighter than the global limit.
export const uploadLimiter = limiter("upload", 60_000, 30, "UPLOAD_RATE_LIMITED", "user")
// Telemetry beacons from every page view: generous, but bounded so it cannot flood the DB.
export const metricsLimiter = limiter("metrics", 60_000, 120, "RATE_LIMITED")
// Mutating admin/staff calls: tighter than the public budget, counted per account.
const staffLimiter = limiter("staff", 60_000, 120, "RATE_LIMITED", "user")
export const staffWriteLimiter: RequestHandler = (req, res, next) =>
  req.method === "GET" || req.method === "HEAD" ? next() : staffLimiter(req, res, next)
