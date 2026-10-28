// 7.7: per-step schemas picked from the master schema, and "first incomplete step".
import assert from "node:assert/strict"
import { describe, it } from "vitest"

import { checkoutSchema, STEP_SCHEMAS } from "@/features/checkout/schemas"
import {
  firstIncompleteStep,
  stepIndexFromPath,
} from "@/features/checkout/steps"
import { describeSlot, slotDays } from "@/features/checkout/slots"

describe("19-checkout-steps", () => {
  it("holds every assertion of the Stage 1-11 scratch check", async () => {
    const address = { addressId: "a1", pincode: "560001" }
    const delivery = { method: "standard", slot: "2026-10-30|9-12" }
    const payment = { payment: "razorpay" }

    assert.equal(firstIncompleteStep({}), 0)
    assert.equal(firstIncompleteStep({ ...address }), 1) // method missing -> delivery
    assert.equal(
      firstIncompleteStep({ ...address, method: "standard", slot: "" }),
      1
    ) // empty slot
    assert.equal(firstIncompleteStep({ ...address, ...delivery }), 2)
    assert.equal(
      firstIncompleteStep({ ...address, ...delivery, ...payment }),
      3
    ) // everything: review is reachable
    assert.equal(
      firstIncompleteStep({
        ...address,
        pincode: "056001",
        ...delivery,
        ...payment,
      }),
      0
    ) // bad pincode sends you to step 1

    // each step only looks at its own fields
    assert.equal(STEP_SCHEMAS.address.safeParse(address).success, true)
    assert.equal(STEP_SCHEMAS.delivery.safeParse({}).success, false)
    assert.equal(
      STEP_SCHEMAS.review.safeParse({ ...address, ...delivery, ...payment })
        .success,
      true
    )
    assert.equal(
      checkoutSchema.safeParse({ ...address, ...delivery, payment: "bitcoin" })
        .success,
      false
    )

    assert.equal(stepIndexFromPath("/checkout/payment"), 2)
    assert.equal(stepIndexFromPath("/checkout/success/x1"), -1)

    // slots: Sundays are never offered
    const days = slotDays(new Date(2026, 9, 31), 4) // Sat 31 Oct 2026
    assert.equal(
      days.every((d) => d.getDay() !== 0),
      true
    )
    assert.equal(days[1]?.getDate(), 2) // Sun 1 Nov skipped -> Mon 2 Nov
    assert.equal(describeSlot("2026-10-30|16-20"), "Fri, 30 Oct, 4 pm - 8 pm")
    assert.equal(describeSlot(undefined), "no slot chosen")
  })
})
