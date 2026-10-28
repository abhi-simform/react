import assert from "node:assert/strict"
import { describe, it } from "vitest"

import { formatCurrency } from "@/lib/format"

describe("07-format", () => {
  it("holds every assertion of the Stage 1-11 scratch check", async () => {
    assert.equal(formatCurrency(1299900), "₹12,999.00")
    assert.equal(formatCurrency(0), "₹0.00")
    assert.equal(formatCurrency(5), "₹0.05")
    assert.equal(formatCurrency(123456789), "₹12,34,567.89") // en-IN lakh grouping
  })
})
