import { describe, expect, it } from "vitest"

import { addressFormSchema } from "./schemas"

const ok = {
  fullName: "Asha Rao",
  phone: "9876543210",
  line1: "12 MG Road",
  line2: "",
  landmark: "",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560001",
  type: "home",
  isDefault: false,
}
const fails = (patch: object) =>
  addressFormSchema.safeParse({ ...ok, ...patch }).success === false

describe("addressFormSchema", () => {
  it("accepts a valid address and turns empty optional text into undefined", () => {
    const r = addressFormSchema.safeParse(ok)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.line2 ?? undefined).toBeUndefined()
  })
  it.each([
    ["phone starting with 5", { phone: "5876543210" }],
    ["phone too short", { phone: "98765" }],
    ["pincode with leading zero", { pincode: "056001" }],
    ["pincode of 5 digits", { pincode: "56001" }],
    ["unknown state", { state: "Atlantis" }],
    ["one-letter name", { fullName: "A" }],
    ["short street", { line1: "ab" }],
    ["bad type", { type: "boat" }],
  ])("rejects %s", (_n, patch) => expect(fails(patch)).toBe(true))
  it("trims", () => {
    const r = addressFormSchema.safeParse({ ...ok, city: "  Pune  " })
    expect(r.success && r.data.city).toBe("Pune")
  })
})
