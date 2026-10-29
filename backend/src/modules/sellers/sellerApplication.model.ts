import { Schema, model, Types, type InferSchemaType } from "mongoose"

export const APPLICATION_STATUSES = ["pending", "approved", "rejected"] as const

/** A customer asking to sell on the marketplace. Approving flips the user's role to "seller". */
const schema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true },
    businessName: { type: String, required: true, trim: true, maxlength: 100 },
    gstin: { type: String, trim: true, uppercase: true, maxlength: 15 },
    phone: { type: String, required: true, trim: true },
    about: { type: String, trim: true, maxlength: 600, default: "" },
    status: { type: String, enum: APPLICATION_STATUSES, default: "pending" },
    reviewedBy: { type: Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    reviewNote: String,
  },
  { timestamps: true }
)
schema.index({ status: 1, createdAt: -1 })
schema.index({ user: 1, createdAt: -1 })
// At most ONE pending application per user, enforced by the database (race-safe).
schema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
)

export type SellerApplicationDoc = InferSchemaType<typeof schema> & {
  _id: Types.ObjectId
  createdAt: Date
}
export const SellerApplication = model("SellerApplication", schema)
