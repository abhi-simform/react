import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react"

/**
 * Measurement only (13.2). In `vite dev` it wraps its children in React's <Profiler> and keeps a
 * running tally on `window.__perf` (commit count and total render time per id), which
 * `scripts/perf/interaction.mjs` reads. In a production build the profiler is compiled out by
 * React anyway, so this renders the children unchanged. It never affects what is rendered.
 */
type Tally = {
  commits: number
  renderMs: number
  mounts: number
  updates: number
}
type PerfStore = { tally: Record<string, Tally>; reset: () => void }

function store(): PerfStore {
  const w = window as unknown as { __perf?: PerfStore }
  return (w.__perf ??= {
    tally: {},
    reset() {
      w.__perf!.tally = {}
    },
  })
}

const record: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
  const t = (store().tally[id] ??= {
    commits: 0,
    renderMs: 0,
    mounts: 0,
    updates: 0,
  })
  t.commits++
  t.renderMs = Math.round((t.renderMs + actualDuration) * 10) / 10
  if (phase === "mount") t.mounts++
  else if (phase === "update") t.updates++
}

export function PerfProfiler({
  id,
  children,
}: {
  id: string
  children: ReactNode
}) {
  if (!import.meta.env.DEV) return children
  return (
    <Profiler id={id} onRender={record}>
      {children}
    </Profiler>
  )
}
