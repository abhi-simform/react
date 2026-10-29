import type { RequestHandler, Response } from "express"
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

export type FieldChanges = Record<string, { before: unknown; after: unknown }>

const clip = (v: unknown): unknown => {
  if (v === undefined || v === null) return null
  if (typeof v === "string") return v.length > 300 ? `${v.slice(0, 300)}...` : v
  if (typeof v === "number" || typeof v === "boolean") return v
  const j = JSON.stringify(v) // dates, ids, arrays, sub-documents: a short JSON string
  return j.length > 300 ? `${j.slice(0, 300)}...` : j
}

/**
 * Which top-level fields differ between two snapshots, as `{ field: { before, after } }`. Values are
 * clipped and made JSON-safe. Only the named `keys` are compared (never password hashes, tokens, whole bodies).
 */
export function diffFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown>,
  keys: string[]
): FieldChanges {
  const out: FieldChanges = {}
  for (const k of keys) {
    const b = clip(before?.[k])
    const a = clip(after[k])
    if (JSON.stringify(b) !== JSON.stringify(a)) out[k] = { before: b, after: a }
  }
  return out
}

/**
 * Hand the before/after of the CURRENT request to the audit middleware (it writes the row when the
 * response finishes with a 2xx). Call it in the handler once the change succeeded; returns `after`.
 */
export function auditChange<T extends Record<string, unknown>>(
  res: Response,
  before: Record<string, unknown> | null | undefined,
  after: T,
  keys: string[]
): T {
  const changes = diffFields(before, after, keys)
  if (Object.keys(changes).length) res.locals.auditChanges = changes
  return after
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
    if (res.statusCode >= 400 || !req.user || res.locals.auditSkip) return
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
      meta: res.locals.auditChanges ? { changes: res.locals.auditChanges } : undefined,
    })
  })
  next()
}
