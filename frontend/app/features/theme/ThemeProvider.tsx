import { createContext, useContext, useEffect, useMemo } from "react"

import { useLocalStorage } from "@/hooks/useLocalStorage"
import { useMediaQuery } from "@/hooks/useMediaQuery"

export type Theme = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

type ThemeValue = {
  /** What the user chose. */
  theme: Theme
  /** What is actually applied: `system` resolved through the OS setting. */
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = "shopsphere.theme"
const isTheme = (v: unknown): v is Theme =>
  v === "light" || v === "dark" || v === "system"

const ThemeContext = createContext<ThemeValue | null>(null)

/**
 * Light / dark / system (8.2). The CHOICE is persisted (`localStorage`, synced across tabs by
 * `useLocalStorage`); the applied theme is DERIVED from it and the OS preference, never
 * stored: with `system` the page follows `prefers-color-scheme` live. The effect writes the
 * `dark` class (what Tailwind's `dark:` variant and shadcn's `.dark` variables look for) and
 * `color-scheme` (native form controls, scrollbars) on `<html>`: that is syncing with an
 * external system (the DOM), a legitimate effect. The first render uses what `useLocalStorage` returns (the
 * server snapshot is "system", so SSR would match); a stored "dark" is applied by the effect
 * after paint (a brief light flash; Stage 13 adds the inline <head> script that removes it).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useLocalStorage<Theme>(
    STORAGE_KEY,
    "system",
    isTheme
  )
  const systemIsDark = useMediaQuery("(prefers-color-scheme: dark)")
  const resolvedTheme: ResolvedTheme =
    theme === "system" ? (systemIsDark ? "dark" : "light") : theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", resolvedTheme === "dark")
    root.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  // `setTheme` from useLocalStorage is stable, so the value only changes when the theme does.
  const value = useMemo<ThemeValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  )
  return <ThemeContext value={value}>{children}</ThemeContext>
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error("useTheme must be used inside <ThemeProvider>")
  return value
}
