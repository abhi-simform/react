import { describe, expect, it } from "vitest"

import { canTransition, staffActions, TRANSITIONS } from "./transitions"
import { ORDER_STATUSES } from "./types"

describe("order state machine (copy of the API's)", () => {
  it("every status is listed", () => {
    expect(Object.keys(TRANSITIONS).sort()).toEqual([...ORDER_STATUSES].sort())
  })
  it.each([
    ["placed", "packed", true],
    ["placed", "shipped", false], // cannot skip packing
    ["packed", "cancelled", false], // too late to cancel
    ["delivered", "placed", false],
    ["cancelled", "placed", false],
    ["return_requested", "delivered", true], // a rejected return goes back
  ] as const)("%s -> %s is %s", (from, to, ok) => {
    expect(canTransition(from, to)).toBe(ok)
  })
})

describe("staffActions: the buttons the status bar may show", () => {
  it.each([
    ["pending_payment", ["cancelled"]], // the gateway places it, staff may only cancel
    ["placed", ["packed", "cancelled"]],
    ["packed", ["shipped"]],
    ["shipped", ["out_for_delivery", "delivered"]],
    ["out_for_delivery", ["delivered"]],
    ["delivered", []], // return_requested is the CUSTOMER's move
    ["return_requested", ["returned", "delivered"]],
    ["returned", ["refunded"]],
    ["cancelled", []],
    ["refunded", []],
  ] as const)("%s offers %j", (from, expected) => {
    expect(staffActions(from).map((a) => a.to)).toEqual([...expected])
  })
  it("never offers a move the state machine forbids", () => {
    for (const from of ORDER_STATUSES)
      for (const a of staffActions(from))
        expect(canTransition(from, a.to)).toBe(true)
  })
})
