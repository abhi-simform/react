import { describe, expect, it } from "vitest"

import { STEP_SCHEMAS, checkoutSchema } from "./schemas"
import { describeSlot, slotDays } from "./slots"
import { firstIncompleteStep, stepIndexFromPath } from "./steps"

const address = { addressId: "a1", pincode: "560001" }
const delivery = { method: "standard", slot: "2026-10-30|9-12" }
const payment = { payment: "razorpay" }

describe("firstIncompleteStep", () => {
  it.each([
    ["nothing", {}, 0],
    ["garbage", "nope", 0],
    ["null", null, 0],
    ["address only", address, 1],
    ["empty slot", { ...address, method: "standard", slot: "" }, 1],
    ["address+delivery", { ...address, ...delivery }, 2],
    ["everything", { ...address, ...delivery, ...payment }, 3],
    [
      "bad pincode sends you back to step 1",
      { ...address, pincode: "056001", ...delivery, ...payment },
      0,
    ],
  ])("%s -> %i", (_n, values, step) => {
    expect(firstIncompleteStep(values)).toBe(step)
  })
})

describe("step schemas / paths / slots", () => {
  it("each step only looks at its own fields", () => {
    expect(STEP_SCHEMAS.address.safeParse(address).success).toBe(true)
    expect(STEP_SCHEMAS.delivery.safeParse({}).success).toBe(false)
    expect(
      checkoutSchema.safeParse({ ...address, ...delivery, payment: "bitcoin" })
        .success
    ).toBe(false)
  })
  it.each([
    ["/checkout/address", 0],
    ["/checkout/payment", 2],
    ["/checkout/success/x1", -1],
    ["/cart", -1],
  ])("stepIndexFromPath(%s) = %i", (path, i) => {
    expect(stepIndexFromPath(path)).toBe(i)
  })
  it("Sundays are never offered", () => {
    const days = slotDays(new Date(2026, 9, 31), 4)
    expect(days.every((d) => d.getDay() !== 0)).toBe(true)
    expect(days[1]?.getDate()).toBe(2)
  })
  it("describeSlot", () => {
    expect(describeSlot("2026-10-30|16-20")).toBe("Fri, 30 Oct, 4 pm - 8 pm")
    expect(describeSlot(undefined)).toBe("no slot chosen")
  })
})
