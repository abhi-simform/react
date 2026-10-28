// 7.5: the seller product schema (variants, unique SKUs, MRP >= price), pure.
import assert from "node:assert/strict"
import { describe, it } from "vitest"

import { productFormSchema } from "@/features/seller/schemas"

describe("18-seller-schema", () => {
  it("holds every assertion of the Stage 1-11 scratch check", async () => {
    const variant = (over: Record<string, string> = {}) => ({
      sku: "TSHIRT-RED-M",
      color: "Red",
      size: "M",
      price: "499",
      mrp: "799",
      stock: "10",
      ...over,
    })
    const base = {
      images: [new File(["x"], "a.png", { type: "image/png" })],
      title: "Cotton T-shirt",
      brand: "Acme",
      category: "men",
      description: "A soft cotton t-shirt for everyday wear.",
      variants: [variant()],
      specs: [{ name: "Fabric", value: "Cotton" }],
    }

    const out = productFormSchema.parse(base)
    assert.equal(out.variants[0]?.price, 499) // string in, number out
    assert.equal(typeof out.variants[0]?.stock, "number")

    const issuesOf = (v: unknown) => {
      const r = productFormSchema.safeParse(v)
      return r.success
        ? []
        : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
    }

    assert.deepEqual(issuesOf({ ...base, variants: [] }), [
      "variants: Add at least one variant",
    ])
    assert.ok(
      issuesOf({ ...base, variants: [variant({ price: "0" })] }).includes(
        "variants.0.price: Must be greater than 0"
      )
    )
    assert.ok(
      issuesOf({ ...base, variants: [variant({ price: "900" })] }).includes(
        "variants.0.mrp: MRP must be at least the price"
      )
    )
    assert.ok(
      issuesOf({ ...base, variants: [variant({ price: "" })] }).includes(
        "variants.0.price: Required"
      )
    )
    assert.ok(
      issuesOf({ ...base, variants: [variant({ stock: "1.5" })] }).includes(
        "variants.0.stock: Whole units only"
      )
    )

    // duplicate SKU: the error is on the SECOND row, case-insensitive, and still reported
    // while ANOTHER row has its own error
    const dup = issuesOf({
      ...base,
      variants: [
        variant(),
        variant({ sku: "other-1", price: "0" }),
        variant({ sku: "tshirt-red-m" }),
      ],
    })
    assert.ok(
      dup.includes("variants.2.sku: Duplicate SKU (same as row 1)"),
      dup.join("\n")
    )
    assert.ok(dup.includes("variants.1.price: Must be greater than 0"))

    assert.ok(
      issuesOf({ ...base, specs: [{ name: "", value: "x" }] }).includes(
        "specs.0.name: Required"
      )
    )
  })
})
