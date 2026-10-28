// BUG 5: useEffect used to derive state. SYMPTOM: after changing the quantity
// the total is wrong for one committed frame (flash of stale UI), and the
// component renders twice per click. CAUSE: `total` is stored state that an
// effect updates AFTER the render that changed `qty`. FIX: compute it in render.
import { useEffect, useRef, useState } from "react"

const PRICE = 499

/** Counts commits whose shown total disagrees with qty * price. */
function useWrongFrames(qty: number, shownTotal: number) {
  const wrong = useRef(0)
  const commits = useRef(0)
  useEffect(() => {
    commits.current++
    if (shownTotal !== qty * PRICE) wrong.current++
  })
  return { wrong, commits }
}

function Stats({
  id,
  wrong,
  commits,
}: {
  id: string
  wrong: React.RefObject<number>
  commits: React.RefObject<number>
}) {
  const out = useRef<HTMLOutputElement>(null)
  return (
    <>
      <button
        className="border p-1 text-xs"
        onClick={() => {
          if (out.current)
            out.current.textContent = `${commits.current} commits, ${wrong.current} wrong frames`
        }}
      >
        Show stats
      </button>{" "}
      <output ref={out} data-testid={`bug5-${id}-stats`} className="text-xs" />
    </>
  )
}

export function Bug5Broken() {
  const [qty, setQty] = useState(1)
  const [total, setTotal] = useState(PRICE)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the bug: derived data copied into state
    setTotal(qty * PRICE)
  }, [qty])
  const stats = useWrongFrames(qty, total)
  return (
    <p>
      <button
        data-testid="bug5-broken-plus"
        className="border p-1"
        onClick={() => setQty((q) => q + 1)}
      >
        +
      </button>{" "}
      qty {qty}, total {total} (broken) <Stats id="broken" {...stats} />
    </p>
  )
}

export function Bug5Fixed() {
  const [qty, setQty] = useState(1)
  const total = qty * PRICE // derived: always consistent with qty
  const stats = useWrongFrames(qty, total)
  return (
    <p>
      <button
        data-testid="bug5-fixed-plus"
        className="border p-1"
        onClick={() => setQty((q) => q + 1)}
      >
        +
      </button>{" "}
      qty {qty}, total {total} (fixed) <Stats id="fixed" {...stats} />
    </p>
  )
}
