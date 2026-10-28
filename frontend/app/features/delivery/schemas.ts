import { z } from "zod"

/** `GET /pincodes/:pincode` (B2). Two shapes, told apart by `serviceable`. */
export const pincodeCheckSchema = z.discriminatedUnion("serviceable", [
  z.object({ serviceable: z.literal(false), pincode: z.string() }),
  z.object({
    serviceable: z.literal(true),
    pincode: z.string(),
    zone: z.enum(["metro", "standard", "remote"]),
    state: z.string().nullable(),
    codAvailable: z.boolean(),
    deliveryDays: z.object({ min: z.number(), max: z.number() }),
    estimatedDelivery: z.object({
      from: z.iso.datetime(),
      to: z.iso.datetime(),
    }),
  }),
])
export type PincodeCheck = z.infer<typeof pincodeCheckSchema>
export type Serviceable = Extract<PincodeCheck, { serviceable: true }>
