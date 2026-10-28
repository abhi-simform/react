import { useState } from "react"
import { Outlet } from "react-router"

import { RouteErrorView } from "@/components/common/RouteErrorView"
import { AccountNav } from "@/components/layout/AccountNav"

import type { Route } from "./+types/layout"

/**
 * The sidebar lives in the PARENT route, so navigating between /account/* pages
 * only swaps the <Outlet/>: the sidebar is not remounted and keeps its state.
 */
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function AccountLayout() {
  // Dev-only proof: this counter survives navigation between account pages.
  const [visits, setVisits] = useState(0)
  return (
    <div className="grid gap-4 p-4 md:grid-cols-[12rem_1fr]">
      <aside>
        <AccountNav />
        {import.meta.env.DEV && (
          <button
            type="button"
            className="mt-3 rounded border px-2 py-1 text-xs"
            onClick={() => setVisits((v) => v + 1)}
          >
            Sidebar state: {visits}
          </button>
        )}
      </aside>
      <section aria-label="Account content">
        <Outlet />
      </section>
    </div>
  )
}

/** A crash on one account page keeps the sidebar: the error replaces only the page area. */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <div className="grid gap-4 p-4 md:grid-cols-[12rem_1fr]">
      <aside>
        <AccountNav />
      </aside>
      <section aria-label="Account content">
        <RouteErrorView error={error} />
      </section>
    </div>
  )
}

export function meta() {
  return [{ title: pageTitle("Account") }]
}

export const handle = { breadcrumb: "Account" } satisfies RouteHandle
