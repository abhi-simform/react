import { Schema, model } from "mongoose"

// One row per Web Vitals report from a real browser (field data). Short-lived: 30 days.
const schema = new Schema(
  {
    name: { type: String, enum: ["LCP", "INP", "CLS", "FCP", "TTFB"], required: true },
    value: { type: Number, required: true },
    rating: { type: String, enum: ["good", "needs-improvement", "poor"] },
    path: { type: String, required: true, maxlength: 200 },
    connection: { type: String, maxlength: 20 }, // effectiveType: "4g", "3g", ...
    nav: { type: String, maxlength: 30 }, // navigationType
    ua: { type: String, maxlength: 20 }, // "mobile" | "desktop"
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)
schema.index({ name: 1, path: 1, createdAt: -1 })
schema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 86_400 })
export const WebVital = model("WebVital", schema)
