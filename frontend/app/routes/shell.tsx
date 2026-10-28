import { useRef } from "react"
import { Outlet, useMatches } from "react-router"

import { OfflineBanner } from "@/components/common/OfflineBanner"
import { RouteErrorView } from "@/components/common/RouteErrorView"
import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { StoresSync } from "@/components/common/StoresSync"
import { DevAuthPanel } from "@/features/auth"
import { CompareTray } from "@/features/compare"
import { useRouteFocus } from "@/hooks/useRouteFocus"

import { categoryQueries } from "@/features/catalog"
import { queryClient } from "@/lib/query-client"
import { getBreadcrumb } from "@/types/route-handle"

import type { Route } from "./+types/shell"

/**
 * Prefetch at app start (9.7): the category tree is needed by the header menu on EVERY page, so
 * its request starts as soon as the shell route is matched, before the header renders. NOT
 * awaited (returning the promise would hold the whole page behind it); `prefetchQuery` never
 * throws, and the header's own `useQuery` joins the same in-flight request.
 */
export function clientLoader() {
  void queryClient.prefetchQuery(categoryQueries.tree())
  return null
}

/** Landmarks: header (banner), nav (inside Header), main, footer (contentinfo). */
export default function ShellLayout() {
  const mainRef = useRef<HTMLElement>(null)
  const liveRef = useRef<HTMLDivElement>(null)
  useRouteFocus(mainRef, liveRef)
  // Show the trail when any matched route declares a `handle.breadcrumb`.
  // (Pages with data-driven crumbs have no handle and render <Breadcrumbs trail/> themselves.)
  const hasStaticCrumbs = useMatches().some((m) => getBreadcrumb(m.handle))

  return (
    <div className="flex min-h-svh flex-col">
      {/* First tab stop: hidden until focused, jumps over the header/nav. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:p-2 focus:shadow"
      >
        Skip to content
      </a>
      <OfflineBanner />
      <Header />
      {/* tabIndex -1 lets the skip link and useRouteFocus move keyboard focus here. */}
      <main
        id="main"
        ref={mainRef}
        tabIndex={-1}
        className="flex-1 focus:outline-none"
      >
        {hasStaticCrumbs && <Breadcrumbs />}
        <Outlet />
      </main>
      <Footer />
      <DevAuthPanel />
      <CompareTray />
      <StoresSync />
      {/* Written by useRouteFocus: tells screen readers the page changed. */}
      <div ref={liveRef} role="status" aria-live="polite" className="sr-only" />
    </div>
  )
}

/**
 * Layout-level boundary: if something below the shell fails and no inner
 * boundary caught it, the header and footer are still drawn around the error.
 */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main id="main" className="flex-1">
        <RouteErrorView error={error} />
      </main>
      <Footer />
    </div>
  )
}
