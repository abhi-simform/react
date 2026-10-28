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

// ---- 6.7: display formatting (all Intl, locale and currency are parameters) ----

type Locale = string

/** "12 Oct 2026". Accepts an ISO string or a Date; invalid input gives "" (never "Invalid Date"). */
export function formatDate(
  value: string | Date,
  {
    locale = "en-IN",
    ...options
  }: Intl.DateTimeFormatOptions & { locale?: Locale } = {}
): string {
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date)
}

const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
]

/** "3 days ago" / "in 2 hours". `now` is a parameter so it is testable. */
export function formatRelative(
  value: string | Date,
  { now = new Date(), locale = "en-IN" }: { now?: Date; locale?: Locale } = {}
): string {
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ""
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) {
      return formatter.format(Math.trunc(seconds / size), unit)
    }
  }
  return formatter.format(seconds, "second")
}

/** 1234 -> "1.2K". NB the default locale is en-IN, so 100000 -> "1L" (lakh): correct for India. */
export function formatCount(value: number, locale: Locale = "en-IN"): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

/** Everything a price tag shows, computed ONCE at the boundary. */
export type PriceVM = {
  /** "₹59,999" */
  current: string
  /** "₹79,999", or null when there is no discount */
  mrp: string | null
  discountPercent: number
  /** "25% off", or null */
  discountLabel: string | null
}

export function toPriceVM(
  price: number,
  mrp: number | undefined,
  options: { locale?: Locale; currency?: string } = {}
): PriceVM {
  const { locale = "en-IN", currency = "INR" } = options
  const money = (rupees: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(rupees)
  const hasDiscount = mrp !== undefined && mrp > price
  const discountPercent = hasDiscount
    ? Math.round(((mrp - price) / mrp) * 100)
    : 0
  return {
    current: money(price),
    mrp: hasDiscount ? money(mrp) : null,
    discountPercent,
    discountLabel: discountPercent > 0 ? `${discountPercent}% off` : null,
  }
}
