import {
  currentIntlLocale,
  displayCurrency,
  getRate,
  type Currency,
} from "@/lib/locale"

/**
 * Money for DISPLAY (13.8). Everything is stored and charged in INR; `rupees` is always INR. With no
 * explicit `currency` the amount is converted to the shopper's display currency (see `lib/locale.ts`) and
 * formatted in their language. An explicit `currency` means "this number is already in that currency":
 * no conversion. INR (and an explicit currency) show `inrDigits` decimals; converted display currencies show 2.
 */
function displayMoney(
  rupees: number,
  inrDigits: number,
  locale: string,
  currency?: string
): string {
  const code = currency ?? displayCurrency()
  const converted =
    currency === undefined && code !== "INR"
      ? rupees * getRate(code as Currency)
      : rupees
  // A converted amount (USD 16.11) needs cents; INR, or a currency the caller named, keeps the caller's precision.
  const digits = currency === undefined && code !== "INR" ? 2 : inrDigits
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(converted)
}

/** Format integer paise (1/100 rupee) for display. Only call this at the UI edge. */
export function formatCurrency(
  paise: number,
  currency?: string,
  locale = currentIntlLocale()
): string {
  return displayMoney(paise / 100, 2, locale, currency)
}

/** Format whole rupees (what the API sends for `price`/`mrp`). Only call this at the UI edge. */
export function formatRupees(
  rupees: number,
  locale = currentIntlLocale()
): string {
  return displayMoney(rupees, 0, locale)
}

// ---- 6.7: display formatting (all Intl, locale and currency are parameters) ----

type Locale = string

/** "12 Oct 2026". Accepts an ISO string or a Date; invalid input gives "" (never "Invalid Date"). */
export function formatDate(
  value: string | Date,
  {
    locale = currentIntlLocale(),
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
  {
    now = new Date(),
    locale = currentIntlLocale(),
  }: { now?: Date; locale?: Locale } = {}
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
export function formatCount(
  value: number,
  locale: Locale = currentIntlLocale()
): string {
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
  const { locale = currentIntlLocale(), currency } = options
  const money = (rupees: number) => displayMoney(rupees, 0, locale, currency)
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
