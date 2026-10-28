import { useLocale, useT } from "./LocaleProvider"

/**
 * "Prices are shown in USD for reference only. You are charged in INR." Rendered next to totals, and only
 * when the display currency is not INR (13.8: the currency switch must never look like it changes the bill).
 */
export function ChargedInInr() {
  const t = useT("common")
  const { currency, ready } = useLocale()
  if (currency === "INR" || !ready) return null
  return (
    <p role="note" className="text-xs text-muted-foreground">
      {t("money.chargedInr", { currency })}
    </p>
  )
}
