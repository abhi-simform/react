import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router"

import type { Route } from "./+types/root"
import { RouteErrorView } from "@/components/common/RouteErrorView"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/features/auth"
import { pageTitle } from "@/lib/pageTitle"

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
  return (
    <AuthProvider>
      <Outlet />
      {/* Toasts (sonner): role="status" live region, used for action feedback. */}
      <Toaster position="bottom-right" />
    </AuthProvider>
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
