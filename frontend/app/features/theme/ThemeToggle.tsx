import { Monitor, Moon, Sun } from "lucide-react"

import { useTheme, type Theme } from "./ThemeProvider"

const NEXT: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
}
const ICON = { light: Sun, dark: Moon, system: Monitor } as const

/** One button that cycles light -> dark -> system. The label names the CURRENT choice and the next one. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const Icon = ICON[theme]
  return (
    <button
      type="button"
      aria-label={`Theme: ${theme}. Switch to ${NEXT[theme]}`}
      onClick={() => setTheme(NEXT[theme])}
      className="rounded border p-1"
    >
      <Icon aria-hidden className="size-4" />
    </button>
  )
}
