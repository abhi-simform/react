// Prices are whole rupees (integers) end to end: shown with Intl, sent as integers.
const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})
export const formatRupees = (n: number) => inr.format(n)

/** "1,299" / "1299.5" typed by a human -> integer rupees, or null if it is not a whole number. */
export function parseRupees(input: string): number | null {
  const cleaned = input.replace(/[,\s₹]/g, "")
  if (!/^\d+$/.test(cleaned)) return null
  return Number(cleaned)
}
