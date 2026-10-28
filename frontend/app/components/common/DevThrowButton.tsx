import { useState } from "react"

/**
 * Dev-only: throws DURING RENDER on the next click so the nearest ErrorBoundary
 * can be exercised. (An error thrown inside an event handler is NOT caught by
 * error boundaries; that is why the throw happens in render, after setState.)
 */
export function DevThrowButton() {
  const [boom, setBoom] = useState(false)
  if (boom) throw new Error("Deliberate test error from DevThrowButton")
  if (!import.meta.env.DEV) return null
  return (
    <button
      type="button"
      className="rounded border border-red-400 px-2 py-1 text-sm"
      onClick={() => setBoom(true)}
    >
      Throw error (dev)
    </button>
  )
}
