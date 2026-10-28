import type { RequestHandler } from "express"
import { logger } from "../../config/logger.js"
import { AuditLog } from "./audit.model.js"

const OBJECT_ID = /\b[0-9a-f]{24}\b/gi

export async function recordAudit(entry: {
  actor?: string
  role?: string
  action: string
  method?: string
  path?: string
  targets?: string[]
  status?: number
  ip?: string
  requestId?: string
  meta?: Record<string, unknown>
}) {
  try {
    await AuditLog.create(entry)
  } catch (err) {
    // The audit trail must not break the action it records (but a gap is logged loudly).
    logger.error({ err, entry }, "Failed to write audit log")
  }
}

/**
 * Mount BEFORE the staff routers. It writes one row when a mutating request finishes with a
 * 2xx/3xx outcome, reading req.user at that point (set by the router's own `authenticate`).
 * Failed attempts (401/403) are not audited here: those are rate-limited access logs, not changes.
 */
export const auditStaffWrites: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next()
  const originalUrl = req.originalUrl.split("?")[0]!
  res.on("finish", () => {
    if (res.statusCode >= 400 || !req.user) return
    const targets = originalUrl.match(OBJECT_ID) ?? []
    void recordAudit({
      actor: req.user.id,
      role: req.user.role,
      action: `${req.method} ${originalUrl.replace(OBJECT_ID, ":id").replace("/api/v1", "")}`,
      method: req.method,
      path: originalUrl,
      targets,
      status: res.statusCode,
      ip: req.ip,
      requestId: String(req.id ?? res.getHeader("x-request-id") ?? ""),
    })
  })
  next()
}
