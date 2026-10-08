import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose"
import { ROLES } from "../../config/constants.js"

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false }, // absent for OAuth-only accounts (later)
    role: { type: String, enum: ROLES, default: "customer" },
    phone: { type: String, trim: true },
    avatarUrl: String,
    emailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
    // Only the HASH of one-time tokens is stored.
    emailVerifyTokenHash: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
)

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>
export const User = model("User", userSchema)

/** What we are willing to send to clients. */
export function toPublicUser(u: UserDoc) {
  return {
    id: u.id as string,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone ?? null,
    avatarUrl: u.avatarUrl ?? null,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
  }
}
