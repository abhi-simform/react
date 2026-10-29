import { Schema, model } from "mongoose"

// Product.brand stays a plain string (the storefront reads it directly); this collection is the
// managed list admins edit. Renaming a brand here rewrites the string on its products.
const brandSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true },
    logo: String,
  },
  { timestamps: true }
)
// One brand per name, ignoring case ("apple" and "Apple" are the same brand).
brandSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } })

export const Brand = model("Brand", brandSchema)
