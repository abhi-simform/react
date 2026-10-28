// BUG 3: race on a slow category switch. SYMPTOM: click "Mobiles" (slow) and
// then "Laptops": the list ends up showing Mobiles. CAUSE: no cleanup, the
// older, slower response arrives last and wins. FIX: abort in cleanup.
import { useEffect, useState } from "react"

import { getProducts } from "@/features/catalog"
import { isAbortError, sleep } from "@/lib/async"

const CATEGORIES = ["mobiles", "laptops"] as const
type Category = (typeof CATEGORIES)[number]
const latency: Record<Category, number> = { mobiles: 1500, laptops: 100 } // the slow category

async function load(category: Category, signal?: AbortSignal) {
  await sleep(latency[category]) // simulated slow network
  const page = await getProducts({ category, limit: 3 }, signal)
  return { category, names: page.items.map((p) => p.name) }
}

type Shown = { category: Category; names: string[] } | null

export function Bug3Broken() {
  const [category, setCategory] = useState<Category>("laptops")
  const [shown, setShown] = useState<Shown>(null)
  useEffect(() => {
    load(category).then(setShown) // no cleanup: last response to ARRIVE wins
  }, [category])
  return (
    <Switcher
      id="broken"
      category={category}
      onChange={setCategory}
      shown={shown}
    />
  )
}

export function Bug3Fixed() {
  const [category, setCategory] = useState<Category>("laptops")
  const [shown, setShown] = useState<Shown>(null)
  useEffect(() => {
    const controller = new AbortController()
    load(category, controller.signal)
      .then(setShown)
      .catch((err: unknown) => {
        if (!isAbortError(err)) console.error(err)
      })
    // `sleep` is not abortable, so the stale request may still START after the
    // abort; it is then aborted immediately (signal already aborted) and ignored.
    return () => controller.abort()
  }, [category])
  return (
    <Switcher
      id="fixed"
      category={category}
      onChange={setCategory}
      shown={shown}
    />
  )
}

function Switcher({
  id,
  category,
  onChange,
  shown,
}: {
  id: string
  category: Category
  onChange: (c: Category) => void
  shown: Shown
}) {
  return (
    <div>
      {CATEGORIES.map((c) => (
        <button
          key={c}
          data-testid={`bug3-${id}-${c}`}
          className="mr-2 border p-1 text-sm"
          onClick={() => onChange(c)}
        >
          {c}
        </button>
      ))}
      <p data-testid={`bug3-${id}-out`} className="text-sm">
        selected {category} / showing{" "}
        {shown ? `${shown.category}: ${shown.names[0] ?? "-"}` : "-"}
      </p>
    </div>
  )
}
