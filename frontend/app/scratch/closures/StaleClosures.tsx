// 4.9: stale closures and batched updates, each broken first, then fixed.
// The BROKEN variants are kept (and named) next to the fixed ones.
import { useEffect, useEffectEvent, useState } from "react"

import { useLatest } from "@/hooks/useLatest"

const TICK_MS = 400

function Qty({
  qty,
  onPlus,
  label,
  testId,
}: {
  qty: number
  onPlus: () => void
  label: string
  testId: string
}) {
  return (
    <p>
      <button className="border p-1" onClick={onPlus}>
        {label}
      </button>{" "}
      qty = <span data-testid={`${testId}-qty`}>{qty}</span>
    </p>
  )
}

// ---- Bug 1: three updates in one handler ---------------------------------

/** BROKEN: `qty` is a snapshot of THIS render, so all three calls set qty + 1. Net +1. */
export function BrokenTripleIncrement() {
  const [qty, setQty] = useState(0)
  return (
    <Qty
      testId="triple-broken"
      label="+3 (broken: setQty(qty + 1) x3)"
      qty={qty}
      onPlus={() => {
        setQty(qty + 1)
        setQty(qty + 1)
        setQty(qty + 1)
      }}
    />
  )
}

/** FIXED: functional updates queue "take the latest value and add one". Net +3. */
export function FixedTripleIncrement() {
  const [qty, setQty] = useState(0)
  return (
    <Qty
      testId="triple-fixed"
      label="+3 (fixed: setQty(q => q + 1) x3)"
      qty={qty}
      onPlus={() => {
        setQty((q) => q + 1)
        setQty((q) => q + 1)
        setQty((q) => q + 1)
      }}
    />
  )
}

// ---- Bug 2: an interval that reads state ---------------------------------

function IntervalReport({
  testId,
  logged,
}: {
  testId: string
  logged: number | null
}) {
  return (
    <p className="text-sm">
      interval last logged qty ={" "}
      <span data-testid={`${testId}-logged`}>{logged ?? "-"}</span>
    </p>
  )
}

/** BROKEN: the effect runs once, so the interval callback closes over the FIRST render's qty (0). */
export function BrokenIntervalClosure() {
  const [qty, setQty] = useState(0)
  const [logged, setLogged] = useState<number | null>(null)
  useEffect(() => {
    const id = setInterval(() => setLogged(qty), TICK_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- BROKEN ON PURPOSE (4.9): "stop re-subscribing" by lying about deps
  }, [])
  return (
    <>
      <Qty
        testId="interval-broken"
        label="+1 (broken interval)"
        qty={qty}
        onPlus={() => setQty((q) => q + 1)}
      />
      <IntervalReport testId="interval-broken" logged={logged} />
    </>
  )
}

/** FIX A: put `qty` in the dependency array. Correct, but the interval restarts on every change. */
export function IntervalWithDeps() {
  const [qty, setQty] = useState(0)
  const [logged, setLogged] = useState<number | null>(null)
  useEffect(() => {
    const id = setInterval(() => setLogged(qty), TICK_MS)
    return () => clearInterval(id)
  }, [qty])
  return (
    <>
      <Qty
        testId="interval-deps"
        label="+1 (fix A: deps [qty])"
        qty={qty}
        onPlus={() => setQty((q) => q + 1)}
      />
      <IntervalReport testId="interval-deps" logged={logged} />
    </>
  )
}

/** FIX B: a ref that always holds the latest qty; the interval is created once. */
export function IntervalWithRef() {
  const [qty, setQty] = useState(0)
  const [logged, setLogged] = useState<number | null>(null)
  const latestQty = useLatest(qty)
  useEffect(() => {
    const id = setInterval(() => setLogged(latestQty.current), TICK_MS)
    return () => clearInterval(id)
  }, [latestQty])
  return (
    <>
      <Qty
        testId="interval-ref"
        label="+1 (fix B: useLatest ref)"
        qty={qty}
        onPlus={() => setQty((q) => q + 1)}
      />
      <IntervalReport testId="interval-ref" logged={logged} />
    </>
  )
}

/** FIX C: useEffectEvent: non-reactive logic that always sees the latest values. Not a dependency. */
export function IntervalWithEffectEvent() {
  const [qty, setQty] = useState(0)
  const [logged, setLogged] = useState<number | null>(null)
  const onTick = useEffectEvent(() => setLogged(qty))
  useEffect(() => {
    const id = setInterval(() => onTick(), TICK_MS)
    return () => clearInterval(id)
  }, []) // onTick is deliberately NOT listed: Effect Events must not be dependencies
  return (
    <>
      <Qty
        testId="interval-event"
        label="+1 (fix C: useEffectEvent)"
        qty={qty}
        onPlus={() => setQty((q) => q + 1)}
      />
      <IntervalReport testId="interval-event" logged={logged} />
    </>
  )
}
