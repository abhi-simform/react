import { useEffect, useRef, useState } from "react"

import { useCountdown } from "@/hooks/useCountdown"
import { activeNowTimers } from "@/hooks/useNow"
import { formatCountdown } from "@/lib/duration"

/** Counts its own commits so we can prove that an expired countdown stops rendering. */
function CountingCountdown({
  endsAt,
  offset,
}: {
  endsAt: number
  offset: number
}) {
  const countdown = useCountdown(endsAt, { serverOffsetMs: offset })
  const commits = useRef(0)
  const out = useRef<HTMLOutputElement>(null)
  useEffect(() => {
    commits.current++
    if (out.current) out.current.dataset.commits = String(commits.current)
  })
  return (
    <li>
      <time data-testid="cd">{formatCountdown(countdown)}</time>{" "}
      {countdown.isExpired && <strong>ended</strong>}
      <output ref={out} className="sr-only" />
    </li>
  )
}

export function CountdownLab() {
  // Fixed at mount: three countdowns that end in 3, 60 and 3600 s, plus two more.
  const [start] = useState(() => Date.now())
  const [mounted, setMounted] = useState(true)
  const [offset, setOffset] = useState(0)
  const [timers, setTimers] = useState<number | null>(null)

  return (
    <section className="border p-3">
      <h3 className="font-medium">Five countdowns, one shared timer</h3>
      <div className="my-2 flex flex-wrap items-center gap-3 text-sm">
        <button className="border p-1" onClick={() => setMounted((m) => !m)}>
          {mounted ? "Unmount" : "Mount"}
        </button>
        <button
          className="border p-1"
          onClick={() => setTimers(activeNowTimers())}
        >
          Count intervals
        </button>
        <span data-testid="timers">
          {timers === null ? "" : `${timers} interval(s) running`}
        </span>
        <label>
          server offset (ms){" "}
          <input
            type="number"
            className="w-28 border p-1"
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value) || 0)}
          />
        </label>
      </div>
      {mounted && (
        <ul>
          {[3, 60, 3600, 5400, 86_400 * 2].map((seconds) => (
            <CountingCountdown
              key={seconds}
              endsAt={start + seconds * 1000}
              offset={offset}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
