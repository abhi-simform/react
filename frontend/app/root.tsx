import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router"

import type { Route } from "./+types/root"
import { RouteErrorView } from "@/components/common/RouteErrorView"
import { AuthProvider, IdleWarning, SessionCacheSync } from "@/features/auth"
import { CartSessionSync } from "@/features/cart"
import { RealtimeSync } from "@/features/realtime"
import { RecentlyViewedSync } from "@/features/recommendations"
import { WishlistSessionSync } from "@/features/wishlist"
import { ThemeProvider } from "@/features/theme"
import { ToastProvider } from "@/features/toast"
import { pageTitle } from "@/lib/pageTitle"
import { queryClient } from "@/lib/query-client"

import "./app.css"

/** Fallback title for any route that exports no `meta` of its own (the leaf route's meta wins). */
export function meta() {
  return [{ title: pageTitle() }]
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
  // Order = dependency order: theme first (toasts read it), auth before anything that needs the
  // user (wishlist). Each one is a separate, small context: no mega-context.
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SessionCacheSync />
          <IdleWarning />
          <CartSessionSync />
          <WishlistSessionSync />
          <RecentlyViewedSync />
          <RealtimeSync />
          <ToastProvider>
            <Outlet />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
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
