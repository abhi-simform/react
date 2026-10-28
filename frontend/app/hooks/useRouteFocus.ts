import { useEffect, useRef } from "react"
import { useLocation } from "react-router"

/**
 * Client-side navigation does not reset focus the way a full page load does:
 * keyboard focus stays on the link you clicked (now possibly gone) and screen
 * readers hear nothing. After every PATHNAME change (not search-param edits:
 * ticking a filter must not yank focus) move focus to the new page's <h1> and
 * write the page title into a polite live region.
 */
export function useRouteFocus(
  containerRef: React.RefObject<HTMLElement | null>,
  liveRegionRef: React.RefObject<HTMLElement | null>
) {
  const { pathname } = useLocation()
  // Ignore the first run: initial load (and StrictMode's replay) should not steal focus.
  const lastPath = useRef(pathname)

  useEffect(() => {
    if (lastPath.current === pathname) return
    lastPath.current = pathname

    const container = containerRef.current
    const heading = container?.querySelector("h1")
    const target = heading ?? container
    if (target) {
      target.setAttribute("tabindex", "-1") // focusable by script, not a tab stop
      target.focus({ preventScroll: true }) // scrolling is ScrollRestoration's job
    }
    // Titles update a tick after the route renders: read it after that.
    const timer = setTimeout(() => {
      const live = liveRegionRef.current
      if (live)
        live.textContent = document.title || heading?.textContent || pathname
    }, 150)
    return () => clearTimeout(timer)
  }, [pathname, containerRef, liveRegionRef])
}
