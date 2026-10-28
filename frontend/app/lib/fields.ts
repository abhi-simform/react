import { z } from "zod"

// Field rules shared by every form schema. They mirror the backend's
// (`backend/src/modules/addresses/address.schema.ts`): the server stays authoritative,
// these only give instant feedback.

/** Indian mobile number: 10 digits starting 6-9. */
export const PHONE_RE = /^[6-9]\d{9}$/
/** Indian PIN code: 6 digits, the first is never 0. */
export const PINCODE_RE = /^[1-9]\d{5}$/

export const phoneField = z
  .string()
  .trim()
  .regex(PHONE_RE, { error: "Enter a valid 10-digit mobile number" })

export const pincodeField = z
  .string()
  .trim()
  .regex(PINCODE_RE, { error: "Enter a valid 6-digit pincode" })
