import { useQuery } from "@tanstack/react-query"
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react"
import { useTranslation } from "react-i18next"

import { STALE } from "@/lib/query-client"
import { configKeys } from "@/lib/queryKeys"
import { activateLanguage } from "@/lib/i18n"
import {
  getLocale,
  isRtl,
  setLocale,
  setRates,
  subscribeLocale,
  type Currency,
  type Language,
} from "@/lib/locale"

import { getPublicConfig, ratesFrom } from "./config.api"

type LocaleValue = {
  language: Language
  currency: Currency
  /** The display rates have arrived (until then prices stay in INR). */
  ready: boolean
  /** Changes whenever language or currency does: a `key` that remounts what must be re-rendered. */
  version: string
  setLanguage: (language: Language) => void
  setCurrency: (currency: Currency) => void
}

const LocaleContext = createContext<LocaleValue | null>(null)

/**
 * Language + currency for the whole app (13.8). The CHOICE lives in `lib/locale.ts` (persisted in
 * localStorage, default from `navigator.language`); this provider keeps the world in step with it:
 * - loads the language's strings (lazy chunk) and switches i18next when they are there;
 * - sets `<html lang>` and `dir` (right-to-left languages mirror the layout);
 * - fetches the display rates once (`GET /config/public`, cached an hour) and hands them to the store.
 */
/** What the SERVER renders (it cannot see localStorage or `navigator.language`): a constant object, as required. */
const SERVER_LOCALE = { language: "en", currency: "INR" } as const

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // 14.8: the third argument is the snapshot used during SERVER rendering AND while hydrating. It must be what the
  // server rendered ("en"/INR), not the stored choice: React does not patch attributes such as a <select>'s value
  // at hydration, so the language picker kept saying "English" after a reload in Hindi. useSyncExternalStore then
  // notices the client snapshot differs and re-renders with the stored choice, without a mismatch.
  const { language, currency } = useSyncExternalStore(
    subscribeLocale,
    getLocale,
    () => SERVER_LOCALE
  )

  useEffect(() => {
    void activateLanguage(language)
    document.documentElement.lang = language
    document.documentElement.dir = isRtl(language) ? "rtl" : "ltr"
  }, [language])

  const config = useQuery({
    queryKey: configKeys.public,
    queryFn: ({ signal }) => getPublicConfig(signal),
    staleTime: STALE.static,
    // A display nicety: if the API is down, prices simply stay in INR.
    retry: 1,
  })
  useEffect(() => {
    if (config.data) setRates(ratesFrom(config.data))
  }, [config.data])

  const value = useMemo<LocaleValue>(
    () => ({
      language,
      currency,
      ready: Boolean(config.data),
      // Re-mounting the page loses its local state (and re-runs one-shot flows such as verifying an emailed
      // token), so the key changes only on an explicit switch, plus ONCE when the rates arrive for a
      // visitor whose stored currency is not INR (their first render had to show INR).
      version: `${language}-${currency}-${currency !== "INR" && config.data ? "r" : "-"}`,
      setLanguage: (l) => setLocale({ language: l }),
      setCurrency: (c) => setLocale({ currency: c }),
    }),
    [language, currency, config.data]
  )
  return <LocaleContext value={value}>{children}</LocaleContext>
}

export function useLocale(): LocaleValue {
  const value = useContext(LocaleContext)
  if (!value) throw new Error("useLocale must be used inside <LocaleProvider>")
  return value
}

/** `t` bound to a namespace: `const t = useT("cart")`. Re-renders when the language changes. */
export function useT(
  ns: "common" | "cart" | "product" | "checkout" = "common"
) {
  return useTranslation(ns).t
}
