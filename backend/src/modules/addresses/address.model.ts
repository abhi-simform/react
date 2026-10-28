import {
  Schema,
  model,
  Types,
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose"

export const ADDRESS_TYPES = ["home", "work", "other"] as const
export const MAX_ADDRESSES = 10

const addressSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true, maxlength: 150 },
    line2: { type: String, trim: true, maxlength: 150 },
    landmark: { type: String, trim: true, maxlength: 100 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    pincode: { type: String, required: true, trim: true },
    type: { type: String, enum: ADDRESS_TYPES, default: "home" },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
)
// The database itself guarantees at most ONE default per user (even under concurrent requests).
addressSchema.index(
  { user: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
    name: "one_default_per_user",
  }
)

export type AddressDoc = HydratedDocument<InferSchemaType<typeof addressSchema>>
export const Address = model("Address", addressSchema)

export function toPublicAddress(a: AddressDoc) {
  return {
    id: a.id as string,
    fullName: a.fullName,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2 ?? null,
    landmark: a.landmark ?? null,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    type: a.type,
    isDefault: a.isDefault,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }
}
