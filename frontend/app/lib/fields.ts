// Field rules shared by forms and (from 7.2) Zod schemas. They mirror the backend's
// (`backend/src/modules/addresses/address.schema.ts`): the server stays authoritative.

/** Indian mobile number: 10 digits starting 6-9. */
export const PHONE_RE = /^[6-9]\d{9}$/
/** Indian PIN code: 6 digits, the first is never 0. */
export const PINCODE_RE = /^[1-9]\d{5}$/
