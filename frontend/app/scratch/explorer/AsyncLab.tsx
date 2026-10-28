import { useState } from "react"

import { loadHomeData, type HomeData } from "@/features/catalog"
import { api } from "@/lib/api/client"
import { isAbortError, withTimeout } from "@/lib/async"

// 1.6 playground: promises against the real API, triggered from event handlers (no effects yet).
export function AsyncLab() {
  const [home, setHome] = useState<HomeData | null>(null)
  const [log, setLog] = useState<string[]>([])
  const addLog = (line: string) => setLog((prev) => [...prev, line])

  async function load() {
    setHome(await loadHomeData())
  }

  async function timeoutDemo() {
    try {
      await withTimeout((signal) => api("/products?limit=60", { signal }), 1)
      addLog("finished before 1ms timeout")
    } catch (error) {
      addLog(
        isAbortError(error)
          ? "aborted by timeout (AbortError)"
          : `real failure: ${String(error)}`
      )
    }
  }

  async function timings() {
    const call = () => api("/products?limit=60")
    let t = performance.now()
    await call()
    await call()
    await call()
    const sequential = performance.now() - t
    t = performance.now()
    await Promise.all([call(), call(), call()])
    const parallel = performance.now() - t
    addLog(
      `sequential ${sequential.toFixed(0)}ms vs Promise.all ${parallel.toFixed(0)}ms`
    )
  }

  return (
    <section className="border-t pt-3 text-sm md:col-span-2">
      <h2 className="font-medium">Async lab (1.6)</h2>
      <div className="my-2 flex gap-2">
        <button className="border p-1" onClick={load}>
          Load home data (allSettled)
        </button>
        <button className="border p-1" onClick={timeoutDemo}>
          Timeout after 1ms
        </button>
        <button className="border p-1" onClick={timings}>
          Sequential vs parallel
        </button>
      </div>
      {home && (
        <div>
          <p>
            newest: {home.newest ? `${home.newest.length} items` : "failed"}
          </p>
          <p>
            topRated:{" "}
            {home.topRated ? `${home.topRated.length} items` : "failed"}
          </p>
          {home.errors.map((e) => (
            <p key={e} role="alert" className="text-red-600">
              {e}
            </p>
          ))}
        </div>
      )}
      <ul>
        {log.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </section>
  )
}
