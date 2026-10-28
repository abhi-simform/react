import { z } from "zod"
import { ADDRESS_TYPES } from "./address.model.js"
import { pincodeField } from "../pincodes/pincode.schema.js"

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")

const fields = z.object({
  fullName: z.string().trim().min(2, "Enter the recipient's name").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  line1: z.string().trim().min(3, "Enter the house / street").max(150),
  line2: z.string().trim().max(150).optional(),
  landmark: z.string().trim().max(100).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: pincodeField,
  type: z.enum(ADDRESS_TYPES),
})

export const idParams = z.object({ id: objectId })

export const createAddressSchema = {
  body: fields.extend({
    type: z.enum(ADDRESS_TYPES).default("home"), // default only on create; PATCH must not reset it
    isDefault: z.boolean().optional(),
  }),
}
// PATCH = any subset of fields. The default flag has its own endpoint, so it cannot be un-set here.
export const updateAddressSchema = {
  params: idParams,
  body: fields
    .partial()
    .refine((b) => Object.keys(b).length > 0, "Provide at least one field to update"),
}
export const addressIdSchema = { params: idParams }
