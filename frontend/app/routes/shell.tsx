import { useQueryClient } from "@tanstack/react-query"
import { Fragment, useRef, useState } from "react"
import { Outlet, useMatches } from "react-router"

import { OfflineBanner } from "@/components/common/OfflineBanner"
import { RouteErrorView } from "@/components/common/RouteErrorView"
import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { StoresSync } from "@/components/common/StoresSync"
import { VerifyEmailBanner } from "@/features/auth"
import { useLocale } from "@/features/i18n"
import { CompareTray } from "@/features/compare"
import { useRouteFocus } from "@/hooks/useRouteFocus"

import { categoryNodeSchema } from "@/features/catalog"
import { categoryKeys } from "@/lib/queryKeys"
import { serverGet } from "@/lib/serverApi.server"
import { z } from "@/lib/zod"
import { getBreadcrumb } from "@/types/route-handle"

import type { Route } from "./+types/shell"

/**
 * 14.8 (SSR experiment). In SPA mode this route had a `clientLoader` that started the category request early (9.7).
 * With SSR a route that has a `clientLoader` and NO server `loader` is NOT rendered on the server at all (React Router
 * renders its `HydrateFallback`, i.e. nothing, and runs the clientLoader after hydration): every page's HTML was an
 * empty body until this changed. A server `loader` fixes it: the header's category menu is in the HTML.
 * It must never take the page down: if the API is slow or fails, `categories` is null and the client fetches as before.
 */
export async function loader() {
  const categories = await serverGet(
    "/categories",
    z.array(categoryNodeSchema)
  ).catch(() => null)
  return { categories, loadedAt: Date.now() }
}

/** Landmarks: header (banner), nav (inside Header), main, footer (contentinfo). */
export default function ShellLayout({ loaderData }: Route.ComponentProps) {
  // Seed the (per-request on the server) query cache once, before the header renders and calls useQuery.
  const client = useQueryClient()
  useState(() => {
    const key = categoryKeys.tree()
    // `loaderData` is undefined when the component is rendered by a test router that has no loaders.
    const seed = loaderData as typeof loaderData | undefined
    if (seed?.categories && !client.getQueryData(key))
      client.setQueryData(key, seed.categories, { updatedAt: seed.loadedAt })
  })
  const { version } = useLocale()
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
        className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:rounded focus:bg-background focus:p-2 focus:shadow"
      >
        Skip to content
      </a>
      <OfflineBanner />
      <Header />
      <VerifyEmailBanner />
      {/* tabIndex -1 lets the skip link and useRouteFocus move keyboard focus here. */}
      <main
        id="main"
        ref={mainRef}
        tabIndex={-1}
        className="flex-1 focus:outline-none"
      >
        {hasStaticCrumbs && <Breadcrumbs />}
        {/* Prices, dates and strings are computed during render: a language or currency change re-mounts the
            page content so every one of them is recomputed (the header and providers stay put). */}
        <Fragment key={version}>
          <Outlet />
        </Fragment>
      </main>
      <Footer />
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
