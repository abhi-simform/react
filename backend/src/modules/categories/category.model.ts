import { Schema, model, Types } from "mongoose"

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    parent: { type: Types.ObjectId, ref: "Category", default: null, index: true },
    ancestors: [{ type: Types.ObjectId, ref: "Category" }], // root -> parent, enables "all products under Electronics"
    image: String,
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const Category = model("Category", categorySchema)
