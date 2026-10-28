import { useState } from "react"
import { Outlet } from "react-router"

import { AccountNav } from "@/components/layout/AccountNav"

/**
 * The sidebar lives in the PARENT route, so navigating between /account/* pages
 * only swaps the <Outlet/>: the sidebar is not remounted and keeps its state.
 */
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
