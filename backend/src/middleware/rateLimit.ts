import { rateLimit } from "express-rate-limit"
import { isTest } from "../config/env.js"

const limiter = (windowMs: number, limit: number, code: string) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => isTest,
    handler: (_req, res) =>
      res.status(429).json({
        success: false,
        error: { code, message: "Too many requests, slow down." },
      }),
  })

export const apiLimiter = limiter(60_000, 300, "RATE_LIMITED")
// Credential endpoints: brute-force protection.
export const authLimiter = limiter(15 * 60_000, 30, "AUTH_RATE_LIMITED")
// Uploads are the most expensive thing a client can send: tighter than the global limit.
export const uploadLimiter = limiter(60_000, 30, "UPLOAD_RATE_LIMITED")
