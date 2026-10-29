import { Router } from "express"
import { authenticate, authorize } from "../../middleware/auth.js"
import { valid, validate } from "../../middleware/validate.js"
import { pageMeta } from "../../utils/pagination.js"
import { ok } from "../../utils/response.js"
import { AuditLog } from "./audit.model.js"
import { listAuditSchema } from "./audit.schema.js"

export const adminAuditRoutes = Router()
adminAuditRoutes.use(authenticate, authorize("admin"))

type PopulatedActor = { _id: unknown; name?: string; email?: string } | null | undefined
const actorOf = (a: unknown) => {
  const u = a as PopulatedActor
  return u && typeof u === "object" && "email" in u
    ? { id: String(u._id), name: u.name ?? "", email: u.email ?? "" }
    : null
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

adminAuditRoutes.get("/", validate(listAuditSchema), async (req, res) => {
  const { query: q } = valid<typeof listAuditSchema>(req)
  const filter: Record<string, unknown> = {}
  if (q.actor) filter.actor = q.actor
  if (q.target) filter.targets = q.target
  if (q.entity) filter.path = new RegExp(`/(admin|seller)/${q.entity}(/|$)`)
  if (q.action) filter.action = new RegExp(`^${escape(q.action)}`)
  if (q.from || q.to)
    filter.createdAt = {
      ...(q.from ? { $gte: q.from } : {}),
      ...(q.to ? { $lte: q.to } : {}),
    }
  const [rows, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate("actor", "name email")
      .lean(),
    AuditLog.countDocuments(filter),
  ])
  ok(
    res,
    rows.map((r) => ({
      id: String(r._id),
      at: r.createdAt,
      actor: actorOf(r.actor),
      role: r.role ?? null,
      action: r.action,
      path: r.path,
      targets: r.targets,
      status: r.status,
      ip: r.ip ?? null,
      requestId: r.requestId ?? null,
      changes: (r.meta as { changes?: unknown } | undefined)?.changes ?? null,
    })),
    pageMeta(q.page, q.limit, total)
  )
})
