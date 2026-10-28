// Run: node --import ./scratch/register-alias.mjs scratch/17-form-schemas.ts
// 7.2: the form schemas, pure (no backend, no DOM).
import assert from "node:assert/strict"

import { addressFormSchema } from "@/features/account/schemas"
import { couponSchema } from "@/features/cart/schemas"
import { loginSchema, registerSchema } from "@/features/auth/schemas"
import { reviewSchema } from "@/features/product/schemas"
import { phoneField, pincodeField } from "@/lib/fields"

const ok = (
  schema: { safeParse: (v: unknown) => { success: boolean } },
  v: unknown
) =>
  assert.equal(
    schema.safeParse(v).success,
    true,
    `expected valid: ${JSON.stringify(v)}`
  )
const bad = (
  schema: { safeParse: (v: unknown) => { success: boolean } },
  v: unknown
) =>
  assert.equal(
    schema.safeParse(v).success,
    false,
    `expected invalid: ${JSON.stringify(v)}`
  )

// phone: 10 digits starting 6-9 (7 valid, 8 invalid)
for (const v of [
  "9876543210",
  "6000000000",
  "7123456789",
  "8999999999",
  " 9876543210 ",
  "9000000000",
  "6999999999",
])
  ok(phoneField, v)
for (const v of [
  "5876543210",
  "987654321",
  "98765432101",
  "98765 43210",
  "abcdefghij",
  "",
  "0123456789",
  "+919876543210",
])
  bad(phoneField, v)

// pincode: 6 digits, first not 0 (7 valid, 8 invalid)
for (const v of [
  "560001",
  "110001",
  "411045",
  "999999",
  "100000",
  " 400001 ",
  "682001",
])
  ok(pincodeField, v)
for (const v of [
  "056001",
  "56000",
  "5600011",
  "56 001",
  "abcdef",
  "",
  "000000",
  "56000a",
])
  bad(pincodeField, v)

// register: the plan's schema
const good = {
  name: "Asha Rao",
  email: "ASHA@Example.com",
  password: "Passw0rdOK",
  confirmPassword: "Passw0rdOK",
  acceptTerms: true,
}
const parsed = registerSchema.parse(good)
assert.equal(parsed.email, "asha@example.com") // normalised
for (const patch of [
  { name: " A " },
  { email: "not-an-email" },
  { password: "short1A", confirmPassword: "short1A" },
  { password: "alllowercase1", confirmPassword: "alllowercase1" },
  { password: "NoDigitsHere", confirmPassword: "NoDigitsHere" },
  { acceptTerms: false },
])
  bad(registerSchema, { ...good, ...patch })
// the mismatch error is attached to confirmPassword, not to the form
const mismatch = registerSchema.safeParse({
  ...good,
  confirmPassword: "Different1",
})
assert.equal(mismatch.success, false)
if (!mismatch.success)
  assert.deepEqual(mismatch.error.issues[0]?.path, ["confirmPassword"])

// login
ok(loginSchema, { email: "a@b.co", password: "x" })
bad(loginSchema, { email: "a@b.co", password: "" })

// review: z.input is `unknown` for the rating, z.output is a number
const review = reviewSchema.parse({
  rating: "4",
  text: "  Really good product, works well.  ",
})
assert.equal(review.rating, 4)
assert.equal(typeof review.rating, "number")
assert.equal(review.text, "Really good product, works well.")
bad(reviewSchema, { rating: "", text: "Really good product, works well." }) // "" coerces to 0
bad(reviewSchema, { rating: "6", text: "Really good product, works well." })
bad(reviewSchema, { rating: "3", text: "too short" })
bad(reviewSchema, { rating: "3", text: "x".repeat(501) })

// coupon: trimmed and upper-cased
assert.equal(couponSchema.parse({ code: "  save10 " }).code, "SAVE10")
bad(couponSchema, { code: "ab" })
bad(couponSchema, { code: "has space" })

// address: output drops empty optionals and keeps the enum state
const address = addressFormSchema.parse({
  fullName: "Asha Rao",
  phone: "9876543210",
  line1: "12 MG Road",
  line2: "",
  landmark: "  ",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560001",
  type: "home",
  isDefault: false,
})
assert.equal(address.line2, undefined)
assert.equal(address.landmark, undefined)
bad(addressFormSchema, { ...address, state: "Atlantis" })
bad(addressFormSchema, { ...address, state: "" })

console.log("17-form-schemas: ok")
