// 4.3 demo: a race condition on purpose, and its fix.
// A fake latency makes "watch" slow (1.5 s) and everything else fast, so
// typing "watch" and then replacing it with "cream" delivers the answers OUT
// OF ORDER: the older "watch" response arrives last.
import { useEffect, useState } from "react"

import { getProducts } from "@/features/catalog"
import { isAbortError } from "@/lib/async"

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })
}

async function searchWithLatency(term: string, signal?: AbortSignal) {
  await abortableSleep(term === "watch" ? 1500 : 150, signal)
  const page = await getProducts({ search: term, limit: 5 }, signal)
  return { term, total: page.meta.total }
}

type Shown = { term: string; total: number } | null

/** BROKEN on purpose: no cleanup, so the last response to ARRIVE wins. */
export function NaiveSearch() {
  const [term, setTerm] = useState("")
  const [shown, setShown] = useState<Shown>(null)

  useEffect(() => {
    if (!term) return
    searchWithLatency(term).then(setShown)
  }, [term])

  return (
    <section className="border p-3">
      <h3 className="font-medium">Naive (no cleanup)</h3>
      <input
        aria-label="Search (naive)"
        className="border p-1"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      <p data-testid="naive-out">
        Input: {term || "-"} / showing:{" "}
        {shown ? `${shown.term} (${shown.total})` : "-"}
      </p>
    </section>
  )
}

/** FIXED: cleanup aborts the previous request; AbortError is not a failure. */
export function AbortSearch() {
  const [term, setTerm] = useState("")
  const [shown, setShown] = useState<Shown>(null)

  useEffect(() => {
    if (!term) return
    const controller = new AbortController()
    searchWithLatency(term, controller.signal)
      .then(setShown)
      .catch((err: unknown) => {
        if (isAbortError(err)) return // superseded on purpose: nothing to show
        console.error(err)
      })
    return () => controller.abort()
  }, [term])

  return (
    <section className="border p-3">
      <h3 className="font-medium">With AbortController</h3>
      <input
        aria-label="Search (abort)"
        className="border p-1"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      <p data-testid="abort-out">
        Input: {term || "-"} / showing:{" "}
        {shown ? `${shown.term} (${shown.total})` : "-"}
      </p>
    </section>
  )
}

/**
 * Stretch: the `ignore` flag instead of AbortController. The stale request
 * still completes on the network (wasted bandwidth and server work) but its
 * result is dropped. It also works for async work that cannot be aborted.
 */
export function IgnoreSearch() {
  const [term, setTerm] = useState("")
  const [shown, setShown] = useState<Shown>(null)

  useEffect(() => {
    if (!term) return
    let ignore = false
    searchWithLatency(term).then((result) => {
      if (!ignore) setShown(result)
    })
    return () => {
      ignore = true
    }
  }, [term])

  return (
    <section className="border p-3">
      <h3 className="font-medium">With an ignore flag</h3>
      <input
        aria-label="Search (ignore)"
        className="border p-1"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      <p data-testid="ignore-out">
        Input: {term || "-"} / showing:{" "}
        {shown ? `${shown.term} (${shown.total})` : "-"}
      </p>
    </section>
  )
}
