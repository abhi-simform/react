import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useEffect } from "react"
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router"

import type { Route } from "./+types/root"
import { RouteErrorView } from "@/components/common/RouteErrorView"
import { AuthProvider, IdleWarning, SessionCacheSync } from "@/features/auth"
import { CartSessionSync } from "@/features/cart"
import { RealtimeSync } from "@/features/realtime"
import { RecentlyViewedSync } from "@/features/recommendations"
import { WishlistSessionSync } from "@/features/wishlist"
import { LocaleProvider } from "@/features/i18n"
import { PwaSync } from "@/features/pwa"
import { ThemeProvider, themeInitScript } from "@/features/theme"
import { ToastProvider } from "@/features/toast"
import { env } from "@/lib/env"
import { installGlobalErrorReporting } from "@/lib/globalErrors"
import { canonicalUrl, pageMeta } from "@/lib/seo"
import { queryClient } from "@/lib/query-client"
import { reportWebVitals } from "@/lib/vitals"

import interLatin from "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url"
import "./app.css"

/**
 * Resource hints (13.5/13.11), rendered into <head> at build time (SPA mode prerenders the shell):
 * - preload the one font file every page needs: its URL is in the CSS, which the browser would only
 *   discover after downloading and parsing it (a request chain); a preload starts it at once.
 *   `crossOrigin` is required for fonts even on the same origin.
 * - preconnect to the API origin (the first API request would otherwise pay DNS + TCP + TLS) and to
 *   the image host the seeded catalog uses.
 */
export function links() {
  return [
    {
      rel: "preload",
      href: interLatin,
      as: "font",
      type: "font/woff2",
      crossOrigin: "anonymous" as const,
    },
    {
      rel: "preconnect",
      href: new URL(env.VITE_API_URL).origin,
      // The SPA calls the API with `credentials: "include"`: that uses the credentialed connection pool.
      crossOrigin: "use-credentials" as const,
    },
    // 13.10: installability. The manifest + icons; the service worker itself is registered by <PwaSync/>.
    { rel: "manifest", href: "/manifest.webmanifest" },
    { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
    { rel: "preconnect", href: "https://picsum.photos" },
    { rel: "preconnect", href: "https://fastly.picsum.photos" },
  ]
}

/** Fallback title for any route that exports no `meta` of its own (the leaf route's meta wins). */
export function meta() {
  return pageMeta({
    description:
      "ShopSphere: shop electronics, fashion, home, beauty and more.",
    canonical: canonicalUrl("/"),
  })
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Native controls and scrollbars may use either scheme (the theme script/provider picks one). */}
        <meta name="color-scheme" content="light dark" />
        {/* The browser's own UI (address bar, task switcher) takes the brand colour; darker in dark mode. */}
        <meta
          name="theme-color"
          content="#0f766e"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#0b1f1d"
          media="(prefers-color-scheme: dark)"
        />
        {/* 13.7: sets the `dark` class before first paint (no flash). Must run before the CSS is applied. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  // Errors no boundary can catch (event handlers, timers, forgotten promises): reported once each.
  useEffect(() => installGlobalErrorReporting(), [])
  // Field Web Vitals (13.1): once per page load, console in dev, a beacon to the API in production.
  useEffect(() => reportWebVitals(), [])
  // Order = dependency order: theme first (toasts read it), auth before anything that needs the
  // user (wishlist). Each one is a separate, small context: no mega-context.
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ThemeProvider>
          <AuthProvider>
            <SessionCacheSync />
            <IdleWarning />
            <CartSessionSync />
            <WishlistSessionSync />
            <RecentlyViewedSync />
            <RealtimeSync />
            <PwaSync />
            <ToastProvider>
              <Outlet />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </LocaleProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}

/**
 * The last line of defence: rendered when something outside any nested boundary
 * fails (or the shell itself). It has no header and no providers, so it must
 * not depend on them.
 */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <main className="container mx-auto p-4 pt-16">
      <RouteErrorView error={error} />
    </main>
  )
}
