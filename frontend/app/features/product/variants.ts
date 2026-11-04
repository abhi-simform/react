// Pure variant logic (no React). The real API has no variants yet (one `sku`
// per product), so the PDP is fed demo variants from test/fixtures/variants.ts.
import type { Variant } from "@/types/domain"

/** Only the selected attribute values live in state, e.g. `{ color: "Blue" }`. */
export type Selection = Partial<Record<string, string>>

/** Attribute names in first-seen order: ["color", "storage"]. */
export function attributeNames(variants: readonly Variant[]): string[] {
  const names = new Set<string>()
  for (const v of variants)
    for (const name of Object.keys(v.attributes)) names.add(name)
  return [...names]
}

/** Distinct values of one attribute, in first-seen order. */
export function optionValues(
  variants: readonly Variant[],
  name: string
): string[] {
  const values = new Set<string>()
  for (const v of variants) {
    const value = v.attributes[name]
    if (value !== undefined) values.add(value)
  }
  return [...values]
}

const matchesSelection = (v: Variant, selection: Selection) =>
  Object.entries(selection).every(
    ([name, value]) => value === undefined || v.attributes[name] === value
  )

/** DERIVED, not stored: the variant matching a complete selection, if any. */
export function findVariant(
  variants: readonly Variant[],
  selection: Selection
): Variant | undefined {
  const names = attributeNames(variants)
  if (names.some((n) => selection[n] === undefined)) return undefined
  return variants.find((v) => matchesSelection(v, selection))
}

/**
 * An option is available when some IN-STOCK variant has it and agrees with the
 * other attributes already chosen. Combinations that do not exist, or exist
 * with zero stock, therefore show up disabled.
 */
export function isOptionAvailable(
  variants: readonly Variant[],
  selection: Selection,
  name: string,
  value: string
): boolean {
  const others = { ...selection, [name]: value }
  return variants.some((v) => v.stock > 0 && matchesSelection(v, others))
}

/**
 * Select an option and repair the selection: any OTHER chosen attribute that
 * no longer fits the new choice is cleared, so the UI never holds an invalid
 * combination (e.g. picking Silver drops "64 GB" if Silver 64 GB does not exist).
 */
export function selectOption(
  variants: readonly Variant[],
  selection: Selection,
  name: string,
  value: string
): Selection {
  const next: Selection = { [name]: value }
  for (const [other, otherValue] of Object.entries(selection)) {
    if (other === name || otherValue === undefined) continue
    if (isOptionAvailable(variants, next, other, otherValue)) {
      next[other] = otherValue
    }
  }
  return next
}

/** Derived stock message for the current selection. */
export function stockMessage(variant: Variant | undefined): string {
  if (!variant) return "Select all options to see availability"
  if (variant.stock <= 0) return "Out of stock"
  if (variant.stock <= 5) return `Only ${variant.stock} left`
  return "In stock"
}
