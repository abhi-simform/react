import { Schema, model, Types } from "mongoose"

// One document per (user, product). A unique compound index makes "add" naturally idempotent.
const wishlistSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true },
    product: { type: Types.ObjectId, ref: "Product", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)
wishlistSchema.index({ user: 1, product: 1 }, { unique: true })
wishlistSchema.index({ user: 1, createdAt: -1, _id: 1 }) // list newest-first, stable

export const WishlistItem = model("WishlistItem", wishlistSchema)
