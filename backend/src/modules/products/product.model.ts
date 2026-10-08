import { Schema, model, Types, type InferSchemaType } from "mongoose"
import { slugify } from "../../utils/slugify.js"

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    highlights: [String], // bullet points shown near the title
    brand: { type: String, required: true, trim: true, index: true },
    category: { type: Types.ObjectId, ref: "Category", required: true, index: true },
    categoryPath: [{ type: Types.ObjectId, ref: "Category" }], // category + all ancestors (for subtree filtering)
    tags: [String],
    price: { type: Number, required: true, min: 0 }, // selling price in INR (whole rupees)
    mrp: { type: Number, required: true, min: 0 }, // list price
    discountPercent: { type: Number, default: 0 },
    images: [{ url: { type: String, required: true }, alt: String, _id: false }],
    stock: { type: Number, default: 0, min: 0 },
    sku: { type: String, required: true, unique: true },
    specs: [{ key: String, value: String, _id: false }],
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    soldCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "draft", "archived"],
      default: "active",
      index: true,
    },
    seller: { type: Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
)

productSchema.pre("validate", function () {
  if (this.price != null && this.mrp != null) {
    this.discountPercent =
      this.mrp > 0
        ? Math.max(0, Math.round(((this.mrp - this.price) / this.mrp) * 100))
        : 0
  }
  if (!this.slug && this.name) this.slug = slugify(this.name)
})

// Full-text search with relevance weights (name matters most).
productSchema.index(
  { name: "text", brand: "text", tags: "text", description: "text" },
  { weights: { name: 10, brand: 5, tags: 3, description: 1 }, name: "product_text" }
)
productSchema.index({ status: 1, categoryPath: 1, price: 1 })
productSchema.index({ status: 1, createdAt: -1 })
productSchema.index({ status: 1, ratingAvg: -1 })

export type ProductAttrs = InferSchemaType<typeof productSchema>
export const Product = model("Product", productSchema)
