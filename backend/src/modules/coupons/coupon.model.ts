import { Schema, model, Types } from "mongoose"

// Rules live in the document; evaluation lives in coupon.service.ts. Money is whole rupees.
const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: "" },
    type: { type: String, enum: ["percent", "flat"], required: true },
    value: { type: Number, required: true, min: 1 }, // percent 1..100, flat rupees
    maxDiscount: { type: Number, min: 1 }, // cap for percent coupons
    minOrder: { type: Number, default: 0, min: 0 }, // on the cart subtotal
    firstOrderOnly: { type: Boolean, default: false },
    // Empty = whole cart. Otherwise only lines in these categories (any level of the tree) count.
    categories: [{ type: Types.ObjectId, ref: "Category" }],
    startsAt: Date,
    expiresAt: Date,
    usageLimit: { type: Number, min: 1 }, // total redemptions across all users
    usedCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: 1, min: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)
couponSchema.index({ isActive: 1, expiresAt: 1 })

export const Coupon = model("Coupon", couponSchema)
