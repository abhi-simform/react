// Run: node scratch/07-format.ts
import assert from "node:assert/strict"

import { formatCurrency } from "../app/lib/format.ts"

assert.equal(formatCurrency(1299900), "₹12,999.00")
assert.equal(formatCurrency(0), "₹0.00")
assert.equal(formatCurrency(5), "₹0.05")
assert.equal(formatCurrency(123456789), "₹12,34,567.89") // en-IN lakh grouping
console.log("1.7 ok")
