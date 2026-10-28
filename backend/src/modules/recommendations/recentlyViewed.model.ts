import { Schema, model, Types } from "mongoose"

export const RECENTLY_VIEWED_CAP = 30

// One row per (user, product); viewing again only moves viewedAt forward.
const schema = new Schema({
  user: { type: Types.ObjectId, ref: "User", required: true },
  product: { type: Types.ObjectId, ref: "Product", required: true },
  viewedAt: { type: Date, required: true, default: () => new Date() },
})
schema.index({ user: 1, product: 1 }, { unique: true })
schema.index({ user: 1, viewedAt: -1 })

export const RecentlyViewed = model("RecentlyViewed", schema)
