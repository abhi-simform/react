import { z } from "zod"

export const PINCODE_RE = /^[1-9]\d{5}$/
export const pincodeField = z
  .string()
  .trim()
  .regex(PINCODE_RE, "Enter a valid 6-digit pincode")
export const checkPincodeSchema = { params: z.object({ pincode: pincodeField }) }
