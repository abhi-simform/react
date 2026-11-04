/** Format integer paise (1/100 rupee) for display. Only call this at the UI edge. */
export function formatCurrency(
  paise: number,
  currency = "INR",
  locale = "en-IN"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100)
}

/** Format whole rupees (what the API sends for `price`/`mrp`). Only call this at the UI edge. */
export function formatRupees(rupees: number, locale = "en-IN"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees)
}
