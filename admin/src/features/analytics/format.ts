const compactInr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
})
/** Axis labels: "₹12L", "₹1.5K". Tooltips and tables use `formatRupees` (full INR). */
export const formatRupeesCompact = (n: number) => compactInr.format(n)

const day = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: "UTC", // the API's "YYYY-MM-DD" is already an India calendar day: do not shift it again
})
export const formatDay = (ymd: string) =>
  day.format(new Date(`${ymd}T00:00:00Z`))

/** "+12.5%", "-3%", "new" when there was nothing to compare with. */
export function formatDelta(pct: number | null) {
  if (pct === null) return "new"
  if (pct === 0) return "0%"
  return `${pct > 0 ? "+" : ""}${pct}%`
}
