import { z } from "zod"

import { phoneField, pincodeField } from "@/lib/fields"
import { INDIA_STATES } from "@/lib/indiaStates"

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

// ---- the form (7.2) ---------------------------------------------------------

/** Optional text: the input is "" when untouched; the OUTPUT drops it (`undefined`), so it is left out of the JSON. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `At most ${max} characters` })
    .transform((v) => (v === "" ? undefined : v))

/**
 * What the address form validates. INPUT (what the fields hold) and OUTPUT (what
 * `handleSubmit` hands us) differ on purpose: `line2`/`landmark` go from `string` to
 * `string | undefined`. That is why `useForm` takes `z.input` AND `z.output`.
 * The output is exactly the API's `AddressInput` (checked by a type test in the form).
 */
export const addressFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { error: "Enter the recipient's name" })
    .max(80),
  phone: phoneField,
  line1: z
    .string()
    .trim()
    .min(3, { error: "Enter the house / street" })
    .max(150),
  line2: optionalText(150),
  landmark: optionalText(100),
  city: z.string().trim().min(2, { error: "Enter the city" }).max(80),
  state: z.enum(INDIA_STATES, { error: "Select a state" }),
  pincode: pincodeField,
  type: z.enum(ADDRESS_TYPES),
  isDefault: z.boolean(),
})
export type AddressFormInput = z.input<typeof addressFormSchema>
export type AddressFormOutput = z.output<typeof addressFormSchema>
