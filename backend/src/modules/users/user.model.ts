import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose"
import { ROLES } from "../../config/constants.js"

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false }, // absent for Google-only accounts
    authProviders: {
      type: [String],
      enum: ["password", "google"],
      default: ["password"],
    },
    googleId: { type: String, select: false }, // Google's stable `sub`; unique (see index below)
    role: { type: String, enum: ROLES, default: "customer" },
    phone: { type: String, trim: true },
    avatarUrl: String,
    emailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
    // Only the HASH of one-time tokens is stored.
    emailVerifyTokenHash: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },
    emailVerifySentAt: { type: Date, select: false }, // resend cooldown
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
)

userSchema.index({ googleId: 1 }, { unique: true, sparse: true })

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
    providers: u.authProviders,
    createdAt: u.createdAt,
  }
}
