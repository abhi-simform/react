import { Toaster } from "@/components/ui/sonner"

/**
 * Toasts (8.2). Sonner keeps its toast list in a module-level store, so `toast(...)` works
 * from anywhere (event handlers, plain functions, outside React) and needs no context value:
 * the "provider" is just the one `<Toaster/>` that renders them. It renders inside a polite live
 * region (`<section aria-live="polite">`; each toast is announced when it appears) and takes its light/dark look from our `ThemeProvider`, so mount it inside that.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" />
    </>
  )
}
