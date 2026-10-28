// 4.1 demo. The SAME filter written two ways, each counting its own commits.
import { useEffect, useRef, useState } from "react"

import { filterProducts, type Product } from "@/features/catalog"
import { productsFixture } from "@/test/fixtures/products"

const products: readonly Product[] = productsFixture

/** Counts commits and "wrong frames" (a commit where the list disagrees with the input). */
function useCommitStats(isWrongFrame: boolean) {
  const commits = useRef(0)
  const wrongFrames = useRef(0)
  // No dependency array: runs after EVERY commit, which is what we want to count.
  useEffect(() => {
    commits.current++
    if (isWrongFrame) wrongFrames.current++
  })
  return { commits, wrongFrames }
}

function Stats({
  label,
  commits,
  wrongFrames,
}: {
  label: string
  commits: React.RefObject<number>
  wrongFrames: React.RefObject<number>
}) {
  const out = useRef<HTMLOutputElement>(null)
  return (
    <div>
      {/* Reading the refs in an event handler (not in render) is allowed. */}
      <button
        className="border p-1 text-xs"
        onClick={() => {
          if (out.current)
            out.current.textContent = `${commits.current} commits, ${wrongFrames.current} wrong frames`
          console.log(label, commits.current, wrongFrames.current)
        }}
      >
        Show stats
      </button>{" "}
      <output ref={out} data-testid={`${label}-stats`} className="text-xs" />
    </div>
  )
}

/** WRONG on purpose: derived data copied into state by an effect. */
export function EffectFilter() {
  const [search, setSearch] = useState("")
  const [filtered, setFiltered] = useState<Product[]>(() => [...products])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberately wrong (4.1 demo)
    setFiltered(filterProducts(products, { search }))
  }, [search])

  // A commit is "wrong" when the list on screen is not the list for the input.
  const expected = filterProducts(products, { search }).length
  const stats = useCommitStats(filtered.length !== expected)

  return (
    <section className="border p-3">
      <h3 className="font-medium">Effect + state (wrong)</h3>
      <input
        aria-label="Search (effect version)"
        className="border p-1"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <p data-testid="effect-count">{filtered.length} products</p>
      <Stats label="effect" {...stats} />
    </section>
  )
}

/** RIGHT: computed during render. */
export function DerivedFilter() {
  const [search, setSearch] = useState("")
  const filtered = filterProducts(products, { search })
  const stats = useCommitStats(false)

  return (
    <section className="border p-3">
      <h3 className="font-medium">Derived in render (right)</h3>
      <input
        aria-label="Search (derived version)"
        className="border p-1"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <p data-testid="derived-count">{filtered.length} products</p>
      <Stats label="derived" {...stats} />
    </section>
  )
}
