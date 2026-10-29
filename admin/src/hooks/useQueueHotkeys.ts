import { useEffect, useRef } from "react"

type Handlers = Partial<Record<string, () => void>>

const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"])

/**
 * Single-key shortcuts for a work queue (`j`/`k` to move, `a`/`r` to approve/reject, ...), written by
 * hand instead of a library. Rules that keep it from fighting the page:
 *  - ignored while typing in a field or inside a dialog/menu (`role=dialog`),
 *  - ignored with Ctrl/Meta/Alt held (browser shortcuts keep working),
 *  - handlers are read from a ref, so a new closure each render needs no re-subscribe.
 */
export function useQueueHotkeys(handlers: Handlers, enabled = true) {
  const ref = useRef(handlers)
  ref.current = handlers
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target instanceof HTMLElement ? e.target : null
      if (t && (TYPING.has(t.tagName) || t.isContentEditable)) return
      if (t?.closest("[role=dialog],[role=alertdialog],[role=menu]")) return
      const fn = ref.current[e.key.toLowerCase()]
      if (!fn) return
      e.preventDefault()
      fn()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [enabled])
}
