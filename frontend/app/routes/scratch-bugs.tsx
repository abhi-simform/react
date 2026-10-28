// Throwaway (4.10): five broken effects, each with its fix.
import { useState } from "react"

import {
  Bug1Broken,
  Bug1Fixed,
  bug1Stats,
} from "@/scratch/bugs/Bug1InfiniteFetch"

function Bug({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border p-3">
      <h2 className="mb-2 font-medium">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}

export default function ScratchBugs() {
  // Each bug mounts on demand so its counters start from zero.
  const [showBug1, setShowBug1] = useState<"none" | "broken" | "fixed">("none")
  const [stats1, setStats1] = useState("")
  const [stats2, setStats2] = useState("")
  return (
    <div className="grid gap-3 p-4 md:grid-cols-2">
      <Bug title="1. Infinite fetch loop (object dependency)">
        <div className="flex gap-2 text-sm">
          <button
            className="border p-1"
            onClick={() => {
              bug1Stats.requests = 0
              setShowBug1("broken")
            }}
          >
            Mount broken
          </button>
          <button
            className="border p-1"
            onClick={() => {
              bug1Stats.requests = 0
              setShowBug1("fixed")
            }}
          >
            Mount fixed
          </button>
          <button
            className="border p-1"
            onClick={() => setStats1(`requests: ${bug1Stats.requests}`)}
          >
            Count requests
          </button>
          <output data-testid="bug1-out">{stats1}</output>
        </div>
        {showBug1 === "broken" && <Bug1Broken />}
        {showBug1 === "fixed" && <Bug1Fixed />}
      </Bug>
    </div>
  )
}
