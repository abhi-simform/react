import { Schema, model } from "mongoose"

export const BANNER_PLACEMENTS = ["hero", "strip"] as const

// Home-page content managed by admins. Active = switched on AND inside its optional window.
const bannerSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    subtitle: { type: String, trim: true, maxlength: 200 },
    imageUrl: { type: String, required: true },
    linkUrl: { type: String, required: true }, // same-site path such as /deals
    placement: { type: String, enum: BANNER_PLACEMENTS, default: "hero" },
    sortOrder: { type: Number, default: 0 },
    startsAt: Date,
    endsAt: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)
bannerSchema.index({ placement: 1, isActive: 1, sortOrder: 1 })

export const Banner = model("Banner", bannerSchema)
