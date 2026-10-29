import { Schema, model } from "mongoose"

/** Platform settings: ONE document (key "platform"). Defaults live in settings.service.ts. */
const schema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    storeName: String,
    supportEmail: String,
    lowStockThreshold: Number,
    announcement: String,
  },
  { timestamps: true }
)
export const Setting = model("Setting", schema)
