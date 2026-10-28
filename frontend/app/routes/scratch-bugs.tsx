// Throwaway (4.10): five broken effects, each with its fix.
import { useState } from "react"

import {
  Bug1Broken,
  Bug1Fixed,
  bug1Stats,
} from "@/scratch/bugs/Bug1InfiniteFetch"
import { Bug2Demo, bug2Stats } from "@/scratch/bugs/Bug2ResizeListener"
import { Bug3Broken, Bug3Fixed } from "@/scratch/bugs/Bug3CategoryRace"
import { Bug4Broken, Bug4Fixed } from "@/scratch/bugs/Bug4StaleInterval"
import { Bug5Broken, Bug5Fixed } from "@/scratch/bugs/Bug5DerivedFlash"

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
      <Bug title="2. Missing cleanup on resize">
        <Bug2Demo fixed={false} />
        <Bug2Demo fixed />
        <button
          className="w-fit border p-1 text-sm"
          onClick={() =>
            setStats2(`added ${bug2Stats.added}, removed ${bug2Stats.removed}`)
          }
        >
          Count listeners
        </button>
        <output data-testid="bug2-out">{stats2}</output>
      </Bug>
      <Bug title="3. Race on a slow category switch">
        <Bug3Broken />
        <Bug3Fixed />
      </Bug>
      <Bug title="4. Stale closure in an interval">
        <Bug4Broken />
        <Bug4Fixed />
      </Bug>
      <Bug title="5. useEffect that derives state (flash of wrong UI)">
        <Bug5Broken />
        <Bug5Fixed />
      </Bug>
    </div>
  )
}
