// BUG 2: missing cleanup. SYMPTOM: every time the component is shown again the
// number of resize listeners grows (and handlers keep updating dead components).
// CAUSE: addEventListener without removeEventListener. FIX: return a cleanup.
import { useEffect, useState } from "react"

export const bug2Stats = { added: 0, removed: 0 }

function useWidthBroken() {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener("resize", onResize)
    bug2Stats.added++
    onResize()
    // no cleanup: the listener outlives the component
  }, [])
  return width
}

function useWidthFixed() {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener("resize", onResize)
    bug2Stats.added++
    onResize()
    return () => {
      window.removeEventListener("resize", onResize)
      bug2Stats.removed++
    }
  }, [])
  return width
}

export function Bug2Broken() {
  return <p>width {useWidthBroken()} (broken: leaks a listener)</p>
}
export function Bug2Fixed() {
  return <p>width {useWidthFixed()} (fixed: removes its listener)</p>
}

/** Mount/unmount toggle so the leak can be provoked. */
export function Bug2Demo({ fixed }: { fixed: boolean }) {
  const [shown, setShown] = useState(true)
  return (
    <div>
      <button
        className="border p-1 text-sm"
        onClick={() => setShown((s) => !s)}
      >
        {shown ? "Hide" : "Show"}
      </button>
      {shown && (fixed ? <Bug2Fixed /> : <Bug2Broken />)}
    </div>
  )
}
