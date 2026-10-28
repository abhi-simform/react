import { displayDiscount, safeBrandName } from "@/features/catalog/utils"

describe("05-defensive", () => {
  it("holds every assertion of the Stage 1-11 scratch check", async () => {
    let failures = 0
    function check(ok: boolean, message: string) {
      if (!ok) {
        failures++
        console.assert(false, message)
      }
    }

    check(
      displayDiscount({ discountPercent: 0 }) === "No discount",
      "0 -> No discount"
    )
    check(displayDiscount({}) === "No discount", "undefined -> No discount")
    check(
      displayDiscount({ discountPercent: null }) === "No discount",
      "null -> No discount"
    )
    check(
      displayDiscount({ discountPercent: 20 }) === "20% off",
      "20 -> 20% off"
    )
    check(safeBrandName({ brand: "Apple" }) === "Apple", "brand present")
    check(safeBrandName({}) === "Unbranded", "brand missing")
    check(safeBrandName({ brand: null }) === "Unbranded", "brand null")

    // `||` vs `??` with a price of 0 (a free sample):
    const price: number | undefined = 0
    check((price || 99) === 99, "|| swallows 0 (the bug)")
    check((price ?? 99) === 0, "?? keeps 0")
    // optional chaining on a missing nested object
    const p: { category?: { name: string } } = {}
    check(p.category?.name === undefined, "?. short-circuits")

    if (failures) process.exit(1)
  })
})
