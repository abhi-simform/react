import { Schema, model, Types } from "mongoose"

/**
 * Who did what, when, from where: append-only. Written for every successful staff (admin/seller)
 * write and for a few security events. Never stores request bodies (they can hold passwords,
 * addresses, card-adjacent data): only the route, the target ids and the outcome.
 */
const schema = new Schema(
  {
    actor: { type: Types.ObjectId, ref: "User" },
    role: String,
    action: { type: String, required: true }, // "POST /admin/orders/:id/status"
    method: String,
    path: String, // concrete path, query string stripped
    targets: [String], // the ids found in the path
    status: Number, // HTTP status of the outcome
    ip: String,
    requestId: String,
    meta: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)
schema.index({ createdAt: -1, _id: -1 })
schema.index({ actor: 1, createdAt: -1 })
schema.index({ action: 1, createdAt: -1 })
schema.index({ targets: 1, createdAt: -1 })
// Keep a year (compliance-ish); raise it if the business needs longer.
schema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 86_400 })

export const AuditLog = model("AuditLog", schema)
