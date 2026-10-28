import { useRef, useState } from "react"

import { useFocusShortcut } from "@/hooks/useFocusShortcut"

function Inner() {
  const ref = useRef<HTMLInputElement>(null)
  useFocusShortcut(ref, "/")
  return (
    <input ref={ref} aria-label="Demo field (press /)" className="border p-1" />
  )
}

/** Mount/unmount `Inner` to check that listeners are added and removed in pairs. */
export function SlashShortcutDemo() {
  const [mounted, setMounted] = useState(true)
  return (
    <section className="border p-3">
      <h3 className="font-medium">"/" shortcut listener lifecycle</h3>
      <button className="border p-1" onClick={() => setMounted((m) => !m)}>
        {mounted ? "Unmount" : "Mount"}
      </button>{" "}
      {mounted && <Inner />}
    </section>
  )
}
