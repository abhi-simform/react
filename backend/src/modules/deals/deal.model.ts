import { Schema, model, Types } from "mongoose"

// A time-boxed, stock-limited price for one product. The SERVER clock decides whether a deal is
// live (`startsAt <= now < endsAt`); `claimed` counts units sold at the deal price (incremented
// atomically when an order is placed, released on cancel).
const dealSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: "Product", required: true },
    dealPrice: { type: Number, required: true, min: 0 }, // whole rupees
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    stockLimit: { type: Number, required: true, min: 1 },
    claimed: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true }, // kill switch
    badge: { type: String, trim: true, maxlength: 30 },
  },
  { timestamps: true }
)
dealSchema.index({ product: 1, startsAt: 1, endsAt: 1 })
dealSchema.index({ isActive: 1, endsAt: 1 })

export const Deal = model("Deal", dealSchema)
