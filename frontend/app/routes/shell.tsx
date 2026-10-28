import { useRef } from "react"
import { Outlet } from "react-router"

import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { DevAuthPanel } from "@/features/auth"
import { useRouteFocus } from "@/hooks/useRouteFocus"

/** Landmarks: header (banner), nav (inside Header), main, footer (contentinfo). */
export default function ShellLayout() {
  const mainRef = useRef<HTMLElement>(null)
  const liveRef = useRef<HTMLDivElement>(null)
  useRouteFocus(mainRef, liveRef)

  return (
    <div className="flex min-h-svh flex-col">
      {/* First tab stop: hidden until focused, jumps over the header/nav. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:p-2 focus:shadow"
      >
        Skip to content
      </a>
      <Header />
      {/* tabIndex -1 lets the skip link and useRouteFocus move keyboard focus here. */}
      <main
        id="main"
        ref={mainRef}
        tabIndex={-1}
        className="flex-1 focus:outline-none"
      >
        <Outlet />
      </main>
      <Footer />
      <DevAuthPanel />
      {/* Written by useRouteFocus: tells screen readers the page changed. */}
      <div ref={liveRef} role="status" aria-live="polite" className="sr-only" />
    </div>
  )
}
