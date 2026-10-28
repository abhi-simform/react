import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import { resources as en } from "@/locales/en"

import type { Language } from "./locale"

/**
 * i18next setup (13.8). English is BUNDLED: it is the default and the fallback for any key a translation
 * misses, and bundling it means the common case (an English visitor) makes no extra request and never
 * renders a raw key. Other languages are separate chunks (`locales/<lang>/index.ts`), fetched with a
 * dynamic import() the first time they are needed and registered with `addResourceBundle`.
 * `useSuspense: false`: components render with what is loaded (English) while a language downloads, then
 * re-render when `changeLanguage` completes; nothing ever suspends.
 */
export const NAMESPACES = ["common", "cart", "product", "checkout"] as const

void i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  ns: NAMESPACES,
  defaultNS: "common",
  resources: { en },
  interpolation: { escapeValue: false }, // React escapes
  react: { useSuspense: false },
  initAsync: false, // resources are in memory: initialise synchronously (tests, first render)
})

const loaders: Record<
  Exclude<Language, "en">,
  () => Promise<{ resources: Record<string, object> }>
> = {
  hi: () => import("@/locales/hi"),
  ar: () => import("@/locales/ar"),
}

const loaded = new Set<Language>(["en"])

/** Download (once) and activate a language. Resolves when `t()` returns that language's strings. */
export async function activateLanguage(language: Language): Promise<void> {
  if (!loaded.has(language) && language !== "en") {
    const { resources } = await loaders[language]()
    for (const [ns, bundle] of Object.entries(resources))
      i18n.addResourceBundle(language, ns, bundle, true, true)
    loaded.add(language)
  }
  await i18n.changeLanguage(language)
}

export { i18n }
