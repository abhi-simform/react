import { Monitor, Moon, Sun } from "lucide-react"

import { useT } from "@/features/i18n"

import { useTheme, type Theme } from "./ThemeProvider"

const NEXT: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
}
const ICON = { light: Sun, dark: Moon, system: Monitor } as const

/** One button that cycles light -> dark -> system. The label names the CURRENT choice and the next one. */
export function ThemeToggle() {
  const t = useT("common")
  const { theme, setTheme } = useTheme()
  const Icon = ICON[theme]
  return (
    <button
      type="button"
      aria-label={t("theme.label", {
        current: t(`theme.${theme}`),
        next: t(`theme.${NEXT[theme]}`),
      })}
      onClick={() => setTheme(NEXT[theme])}
      className="rounded border p-1"
    >
      <Icon aria-hidden className="size-4" />
    </button>
  )
}
