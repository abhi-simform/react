import {
  CURRENCIES,
  LANGUAGES,
  LANGUAGE_LABELS,
  type Currency,
  type Language,
} from "@/lib/locale"

import { useLocale, useT } from "./LocaleProvider"

/** Two native selects in the header (13.8): the language of the UI and the currency prices are shown in. */
export function LocaleSwitcher() {
  const t = useT("common")
  const { language, currency, setLanguage, setCurrency } = useLocale()
  return (
    <div className="flex items-center gap-1 text-sm">
      <label>
        <span className="sr-only">{t("switcher.language")}</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="rounded border bg-background p-1"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {LANGUAGE_LABELS[l]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">{t("switcher.currency")}</span>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
          className="rounded border bg-background p-1"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
