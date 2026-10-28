/**
 * Stage 12.7 BUG HUNT. Eight bugs of eight kinds, each as a pair in one place:
 *   `Broken*`  the version as it was written with the bug (kept ON PURPOSE, never imported by the app)
 *   `Fixed*`   the corrected version
 * `bugs.test.tsx` runs ONE regression test per bug against BOTH: it passes for the fixed version and is
 * expected to FAIL for the broken one (`it.fails`), which proves the test can actually catch the bug.
 * The investigation of each (symptom, tool, root cause, fix) is in docs/debug-log.md.
 */
import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { api } from "@/lib/api/client"

// ---- 1. STALE CLOSURE ---------------------------------------------------------------------
// Symptom: the counter goes 0 -> 1 and then sticks at 1.
export function BrokenTicker() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setCount(count + 1), 1000) // `count` is 0 forever in this closure
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <p>ticks: {count}</p>
}
export function FixedTicker() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setCount((c) => c + 1), 1000) // the updater reads the LATEST state
    return () => clearInterval(id)
  }, [])
  return <p>ticks: {count}</p>
}

// ---- 2. MISSING / UNSTABLE KEY ------------------------------------------------------------
// Symptom: remove the first row and the text typed in the SECOND row jumps to the wrong row.
type Row = { id: string; label: string }
function NoteRow({ label, onRemove }: { label: string; onRemove: () => void }) {
  const [note, setNote] = useState("")
  return (
    <li>
      <label>
        Note for {label}
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button onClick={onRemove}>Remove {label}</button>
    </li>
  )
}
export function BrokenNotes({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial)
  return (
    <ul>
      {rows.map((row, index) => (
        <NoteRow
          key={index}
          label={row.label}
          onRemove={() => setRows(rows.filter((r) => r !== row))}
        />
      ))}
    </ul>
  )
}
export function FixedNotes({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial)
  return (
    <ul>
      {rows.map((row) => (
        <NoteRow
          key={row.id}
          label={row.label}
          onRemove={() => setRows(rows.filter((r) => r !== row))}
        />
      ))}
    </ul>
  )
}

// ---- 3. WRONG DEPENDENCY ARRAY -------------------------------------------------------------
// Symptom: navigating from product A to product B keeps showing A.
type Fetcher = (id: string) => Promise<string>
export function BrokenTitle({ id, load }: { id: string; load: Fetcher }) {
  const [title, setTitle] = useState("...")
  useEffect(() => {
    void load(id).then(setTitle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // `id` is missing: the effect never re-runs
  return <h2>{title}</h2>
}
export function FixedTitle({ id, load }: { id: string; load: Fetcher }) {
  const [title, setTitle] = useState("...")
  useEffect(() => {
    let current = true
    void load(id).then((t) => current && setTitle(t))
    return () => {
      current = false
    }
  }, [id, load])
  return <h2>{title}</h2>
}

// ---- 4. UNHANDLED 4xx ----------------------------------------------------------------------
// Symptom: opening a deleted product shows "Loading..." forever (and an unhandled rejection).
export function BrokenProduct({ slug }: { slug: string }) {
  const [name, setName] = useState<string>()
  useEffect(() => {
    void api<{ name: string }>(`/products/${slug}`).then((p) => setName(p.name)) // no .catch
  }, [slug])
  return <p>{name ?? "Loading..."}</p>
}
export function FixedProduct({ slug }: { slug: string }) {
  const [state, setState] = useState<{ name?: string; error?: string }>({})
  useEffect(() => {
    let current = true
    api<{ name: string }>(`/products/${slug}`)
      .then((p) => current && setState({ name: p.name }))
      .catch((e: Error) => current && setState({ error: e.message }))
    return () => {
      current = false
    }
  }, [slug])
  if (state.error) return <p role="alert">Could not load: {state.error}</p>
  return <p>{state.name ?? "Loading..."}</p>
}

// ---- 5. RACE CONDITION ---------------------------------------------------------------------
// Symptom: type "a" then "ab" fast; the list sometimes ends up showing the results for "a".
type Search = (q: string, signal?: AbortSignal) => Promise<string[]>
export function BrokenSearch({ search }: { search: Search }) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<string[]>([])
  useEffect(() => {
    if (q) void search(q).then(setResults) // answers can arrive out of order
  }, [q, search])
  return (
    <div>
      <input
        aria-label="Search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <ul>
        {results.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  )
}
export function FixedSearch({ search }: { search: Search }) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<string[]>([])
  useEffect(() => {
    if (!q) return
    const controller = new AbortController()
    search(q, controller.signal)
      .then((r) => !controller.signal.aborted && setResults(r))
      .catch(() => undefined)
    return () => controller.abort() // a newer query cancels the older one
  }, [q, search])
  return (
    <div>
      <input
        aria-label="Search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <ul>
        {results.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  )
}

// ---- 6. MEMORY LEAK (missing cleanup) -----------------------------------------------------
// Symptom: heap grows each time the page is opened; a handler runs for a page that is gone.
export function BrokenResizeWatcher({ onWide }: { onWide: () => void }) {
  useEffect(() => {
    const handler = () => onWide()
    window.addEventListener("resize", handler) // never removed: one more listener per visit
  }, [onWide])
  return <p>watching</p>
}
export function FixedResizeWatcher({ onWide }: { onWide: () => void }) {
  useEffect(() => {
    const handler = () => onWide()
    window.addEventListener("resize", handler)
    return () => window.removeEventListener("resize", handler)
  }, [onWide])
  return <p>watching</p>
}

// ---- 7. LAYOUT SHIFT -----------------------------------------------------------------------
// Symptom: the text under a product photo jumps down when the image arrives (CLS).
export function BrokenPhoto({ src, name }: { src: string; name: string }) {
  return (
    <figure>
      <img src={src} alt={name} />
      <figcaption>{name}</figcaption>
    </figure>
  )
}
export function FixedPhoto({ src, name }: { src: string; name: string }) {
  return (
    <figure>
      {/* width/height reserve the box before the bytes arrive */}
      <img
        src={src}
        alt={name}
        width={400}
        height={400}
        style={{ aspectRatio: "1 / 1" }}
      />
      <figcaption>{name}</figcaption>
    </figure>
  )
}

// ---- 8. WRONG CACHE KEY --------------------------------------------------------------------
// Symptom: switch category tabs: the list of the FIRST tab stays on screen.
type ListFn = (category: string) => Promise<string[]>
export function BrokenCategoryList({
  category,
  list,
}: {
  category: string
  list: ListFn
}) {
  const { data = [] } = useQuery({
    queryKey: ["category-products"], // ignores `category`: every tab shares one cache entry
    queryFn: () => list(category),
  })
  return (
    <ul>
      {data.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  )
}
export function FixedCategoryList({
  category,
  list,
}: {
  category: string
  list: ListFn
}) {
  const { data = [] } = useQuery({
    queryKey: ["category-products", category], // everything the fetcher reads is in the key
    queryFn: () => list(category),
  })
  return (
    <ul>
      {data.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  )
}
