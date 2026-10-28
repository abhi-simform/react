// BUG 1: infinite fetch loop. SYMPTOM: the Network tab fills with identical
// requests and the page never settles. CAUSE: an object created in render is a
// dependency; every setState re-renders, creates a NEW object, the effect
// re-runs, fetches, sets state... FIX: depend on the primitives.
import { useEffect, useState } from "react"

import { getProducts } from "@/features/catalog"

const MAX = 15 // safety valve for the demo only: the real bug never stops

export const bug1Stats = { requests: 0 }

export function Bug1Broken() {
  const [names, setNames] = useState<string[]>([])
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the bug: an object created in render is a dependency
  const params = { limit: 3, sort: "newest" as const } // new object every render

  useEffect(() => {
    if (bug1Stats.requests >= MAX) return
    bug1Stats.requests++
    getProducts(params).then((page) => setNames(page.items.map((p) => p.name)))
  }, [params])
  return <p>{names.length} products loaded (broken: requests keep coming)</p>
}

export function Bug1Fixed() {
  const [names, setNames] = useState<string[]>([])
  const limit = 3
  const sort = "newest"

  useEffect(() => {
    bug1Stats.requests++
    getProducts({ limit, sort }).then((page) =>
      setNames(page.items.map((p) => p.name))
    )
  }, [limit, sort]) // primitives: same values, same identity, no re-run
  return <p>{names.length} products loaded (fixed: one request)</p>
}
