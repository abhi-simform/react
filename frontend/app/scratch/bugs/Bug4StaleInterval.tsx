// BUG 4: stale closure in an interval. SYMPTOM: the "session timer" counts 0,
// 1, 1, 1... CAUSE: the effect runs once and `seconds` in the callback is the
// first render's 0, so it always sets 0 + 1. FIX: functional update (the next
// value depends only on the previous one, so nothing needs to be a dependency).
import { useEffect, useState } from "react"

export function Bug4Broken() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSeconds(seconds + 1), 200)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the bug: closing over a stale `seconds`
  }, [])
  return <p data-testid="bug4-broken">timer: {seconds} (broken)</p>
}

export function Bug4Fixed() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 200)
    return () => clearInterval(id)
  }, [])
  return <p data-testid="bug4-fixed">timer: {seconds} (fixed)</p>
}
