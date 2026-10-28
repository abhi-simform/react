import { z } from "zod"

export const ADDRESS_TYPES = ["home", "work", "other"] as const

/** `GET /addresses` item (B2). Optional fields come back as `null`, never missing. */
export const addressSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  phone: z.string(),
  line1: z.string(),
  line2: z.string().nullable(),
  landmark: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  type: z.enum(ADDRESS_TYPES),
  isDefault: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type Address = z.infer<typeof addressSchema>

/** What the form sends (strings; empty optional fields are left out by `toInput`). */
export type AddressInput = {
  fullName: string
  phone: string
  line1: string
  line2?: string
  landmark?: string
  city: string
  state: string
  pincode: string
  type: (typeof ADDRESS_TYPES)[number]
  isDefault?: boolean
}

/** `DELETE /addresses/:id`: tells us which address (if any) was auto-promoted to default. */
export const deleteAddressResultSchema = z.object({
  deletedId: z.string(),
  newDefaultId: z.string().nullable(),
})
export type DeleteAddressResult = z.infer<typeof deleteAddressResultSchema>
