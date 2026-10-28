/**
 * The locale store (13.8): which LANGUAGE the UI speaks and which CURRENCY prices are DISPLAYED in.
 * Framework-free on purpose: `lib/format.ts` reads it, `LocaleProvider` writes it, React subscribes
 * through `useSyncExternalStore`. Prices are stored, ordered and CHARGED in INR; the currency here only
 * converts what is shown, with display rates from `GET /config/public`.
 */
export const LANGUAGES = ["en", "hi", "ar"] as const
export type Language = (typeof LANGUAGES)[number]
export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"] as const
export type Currency = (typeof CURRENCIES)[number]

export type LocaleState = { language: Language; currency: Currency }

/** `ar` is a PSEUDO-localisation (English wrapped in right-to-left marks): its purpose is to test RTL layout. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  hi: "हिन्दी",
  ar: "RTL test (ar)",
}
const RTL = new Set<Language>(["ar"])
export const isRtl = (language: Language) => RTL.has(language)

/** The BCP 47 tag `Intl` should format numbers and dates with. */
const INTL_LOCALE: Record<Language, string> = {
  en: "en-IN",
  hi: "hi-IN",
  ar: "ar-EG",
}
export const intlLocaleFor = (language: Language) => INTL_LOCALE[language]

export const STORAGE_KEY = "shopsphere.locale"

const isLanguage = (v: unknown): v is Language =>
  typeof v === "string" && (LANGUAGES as readonly string[]).includes(v)
const isCurrency = (v: unknown): v is Currency =>
  typeof v === "string" && (CURRENCIES as readonly string[]).includes(v)

/** `navigator.language` ("hi-IN", "en-US", "ar") -> a language we have, else English. */
export function languageFromNavigator(tag: string | undefined): Language {
  const base = tag?.toLowerCase().split("-")[0]
  // "ar" is the pseudo test language, never chosen automatically.
  return base === "hi" ? "hi" : "en"
}

/** Stored choice > browser language. Currency defaults to INR (the store's own currency). */
export function readInitialLocale(): LocaleState {
  const fallback: LocaleState = {
    language:
      typeof navigator === "undefined"
        ? "en"
        : languageFromNavigator(navigator.language),
    currency: "INR",
  }
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as {
      language?: unknown
      currency?: unknown
    } | null
    return {
      language: isLanguage(raw?.language) ? raw.language : fallback.language,
      currency: isCurrency(raw?.currency) ? raw.currency : fallback.currency,
    }
  } catch {
    return fallback
  }
}

let state: LocaleState = readInitialLocale()
let rates: Partial<Record<Currency, number>> = { INR: 1 }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const getLocale = () => state
export const subscribeLocale = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function setLocale(patch: Partial<LocaleState>) {
  const next = { ...state, ...patch }
  if (next.language === state.language && next.currency === state.currency)
    return
  state = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* private mode: the choice lasts for this page view */
  }
  emit()
}

/** Display rates INR -> currency (from the API). Unknown currencies fall back to 1 (no conversion). */
export function setRates(next: Partial<Record<Currency, number>>) {
  rates = { INR: 1, ...next }
  emit()
}
export const getRate = (currency: Currency = state.currency) =>
  rates[currency] ?? 1
/**
 * The currency prices are SHOWN in right now: the chosen one, but only once its rate is known. Until then
 * (rates still loading, or the API is down) prices stay in INR rather than show an unconverted number
 * under a foreign symbol.
 */
export const displayCurrency = (): Currency =>
  rates[state.currency] === undefined ? "INR" : state.currency
/** Tests: back to defaults. */
export function resetLocaleForTests() {
  state = { language: "en", currency: "INR" }
  rates = { INR: 1 }
  emit()
}

export const currentIntlLocale = () => intlLocaleFor(state.language)
