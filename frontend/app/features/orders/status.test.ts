import { describe, expect, it } from "vitest"

import type { OrderStatus } from "@/types/domain"

import {
  canCancel,
  canReturn,
  isTerminal,
  statusColor,
  statusLabel,
} from "./status"

const ALL: OrderStatus[] = [
  "pending_payment",
  "placed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "return_requested",
  "returned",
  "refunded",
]

describe("order status rules (every status, table driven)", () => {
  it.each(ALL)("%s: cancel only before packing", (s) => {
    expect(canCancel(s)).toBe(s === "pending_payment" || s === "placed")
  })
  it.each(ALL)("%s: only a delivered order can be returned", (s) => {
    expect(canReturn(s)).toBe(s === "delivered")
  })
  it.each(ALL)("%s: terminal states", (s) => {
    expect(isTerminal(s)).toBe(
      ["delivered", "cancelled", "returned", "refunded"].includes(s)
    )
  })
  it.each(ALL)("%s has a label and a tone", (s) => {
    expect(statusLabel(s)).not.toBe("")
    expect(["neutral", "info", "success", "warning", "danger"]).toContain(
      statusColor(s)
    )
  })
  it("a cancelled/terminal order can never be cancelled again", () => {
    for (const s of ALL) if (isTerminal(s)) expect(canCancel(s)).toBe(false)
  })
})
