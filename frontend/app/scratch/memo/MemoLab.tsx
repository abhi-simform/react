// 4.8 lab: 1,000 products, three ways to render the rows, and counters.
import {
  Profiler,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ProfilerOnRenderCallback,
} from "react"

import {
  ProductCard,
  type ProductCardProduct,
} from "@/features/catalog/components/ProductCard"
import {
  filterProducts,
  priceHistogram,
  type Product,
} from "@/features/catalog"
import { productsFixture } from "@/test/fixtures/products"

// 308 products x 4 with unique ids = 1,232; take 1,000.
const items: Product[] = Array.from({ length: 4 }, (_, copy) =>
  productsFixture.map((p) => ({ ...p, _id: `${p._id}-${copy}` }))
)
  .flat()
  .slice(0, 1000)

const counts = { rows: 0 }

type RowProps = {
  product: ProductCardProduct
  onAddToCart: (product: ProductCardProduct) => void
}

/** Counts every committed render of a row (an effect without deps runs after each one). */
function PlainRow({ product, onAddToCart }: RowProps) {
  useEffect(() => {
    counts.rows++
  })
  return <ProductCard product={product} onAddToCart={onAddToCart} />
}
const MemoRow = memo(PlainRow)

type Mode = "plain" | "memo-inline" | "memo-stable"

export function MemoLab() {
  const [mode, setMode] = useState<Mode>("plain")
  const [search, setSearch] = useState("")
  const [unrelated, setUnrelated] = useState(0)
  const [added, setAdded] = useState<string[]>([])
  const commits = useRef<number[]>([])
  const out = useRef<HTMLPreElement>(null)

  // useMemo: the filter and histogram are real work over 1,000 items.
  const filtered = useMemo(() => filterProducts(items, { search }), [search])
  const histogram = useMemo(() => priceHistogram(filtered, 8), [filtered])

  // Stable identity across renders: required for memo(Row) to ever skip.
  const stableAdd = useCallback((p: ProductCardProduct) => {
    setAdded((a) => [...a, p.slug].slice(-3))
  }, [])

  const onRender: ProfilerOnRenderCallback = (_id, _phase, actualDuration) => {
    commits.current.push(actualDuration)
  }

  function report(label: string) {
    const d = commits.current
    const text = `${label}: ${counts.rows} row renders, ${d.length} commits, ${d
      .reduce((a, b) => a + b, 0)
      .toFixed(1)} ms actualDuration`
    if (out.current) out.current.textContent = text
    console.log(text)
  }
  function reset() {
    counts.rows = 0
    commits.current = []
  }

  const Row = mode === "plain" ? PlainRow : MemoRow

  return (
    <section className="border p-3">
      <h3 className="font-medium">Memo lab (1,000 products)</h3>
      <div className="my-2 flex flex-wrap items-center gap-3 text-sm">
        {(["plain", "memo-inline", "memo-stable"] as const).map((m) => (
          <label key={m}>
            <input
              type="radio"
              name="mode"
              checked={mode === m}
              onChange={() => setMode(m)}
            />{" "}
            {m}
          </label>
        ))}
        <input
          aria-label="Filter"
          className="border p-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="border p-1"
          onClick={() => setUnrelated((n) => n + 1)}
        >
          Unrelated state +1 ({unrelated})
        </button>
        <button className="border p-1" onClick={reset}>
          Reset counters
        </button>
        <button className="border p-1" onClick={() => report(mode)}>
          Show counters
        </button>
      </div>
      <pre ref={out} data-testid="memo-out" className="text-xs" />
      <p className="text-xs">
        {filtered.length} products; histogram buckets: {histogram.length}; last
        added: {added.join(", ") || "-"}
      </p>
      <Profiler id="rows" onRender={onRender}>
        <ul className="grid grid-cols-5 gap-1">
          {filtered.slice(0, 200).map((product) => (
            <li key={product._id}>
              <Row
                product={product}
                // memo-inline: a NEW arrow function every render defeats memo.
                onAddToCart={
                  mode === "memo-stable"
                    ? stableAdd
                    : (p) => setAdded((a) => [...a, p.slug].slice(-3))
                }
              />
            </li>
          ))}
        </ul>
      </Profiler>
    </section>
  )
}

/**
 * Micro-benchmark: what useMemo itself costs on a TRIVIAL computation. It
 * recreates what the hook does on each render (allocate the callback, compare
 * the dependency array) and compares it with just computing the value.
 */
export function trivialMemoBenchmark(iterations = 2_000_000) {
  let sink = 0
  let prevDeps: unknown[] = [0]
  let cached = 0
  const t0 = performance.now()
  for (let i = 0; i < iterations; i++) sink += i * 2 // just compute
  const direct = performance.now() - t0

  const t1 = performance.now()
  for (let i = 0; i < iterations; i++) {
    const deps = [i % 2] // like a deps array created each render
    const compute = () => (i % 2) * 2 // like the callback passed to useMemo
    if (deps.length !== prevDeps.length || !Object.is(deps[0], prevDeps[0])) {
      cached = compute()
      prevDeps = deps
    }
    sink += cached
  }
  const memoLike = performance.now() - t1
  return { direct, memoLike, sink }
}

/** console.time around the real work, to compare with what rendering the rows costs. */
export function histogramTiming() {
  console.time("priceHistogram x100 (1,000 products)")
  for (let i = 0; i < 100; i++) priceHistogram(items, 8)
  console.timeEnd("priceHistogram x100 (1,000 products)")
  console.time("filterProducts x100 (1,000 products)")
  for (let i = 0; i < 100; i++) filterProducts(items, { search: "sony" })
  console.timeEnd("filterProducts x100 (1,000 products)")
}
