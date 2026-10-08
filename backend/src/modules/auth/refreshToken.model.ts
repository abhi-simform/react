import { Schema, model, Types } from "mongoose"

// One document per issued refresh token. Tokens are ROTATED on every refresh; all tokens from
// the same login share a `family`. If an already-used token is presented again, someone stole
// it -> we revoke the whole family (reuse detection).
const refreshTokenSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
    userAgent: String,
    ip: String,
  },
  { timestamps: true }
)
// MongoDB deletes expired documents automatically (TTL index).
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const RefreshToken = model("RefreshToken", refreshTokenSchema)
