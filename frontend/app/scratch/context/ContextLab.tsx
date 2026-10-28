// 8.2 task 4: the context re-render problem, measured. 50 consumers per provider flavour.
// Every consumer only needs the `increment` ACTION, never the count: a "good" context would
// not re-render them when the count ticks. Render counts are read with the buttons below
// (a module-level counter bumped in an effect, so it counts COMMITTED renders).
import { createContext, memo, useContext, useMemo, useState } from "react"
import { useEffect } from "react"

type Kind = "inline" | "memo" | "split"
const renders: Record<Kind, number> = { inline: 0, memo: 0, split: 0 }

// ---- A and B: ONE context carrying { count, increment } -----------------------------------
type Combined = { count: number; increment: () => void }
const CombinedContext = createContext<Combined | null>(null)

// ---- C: SPLIT contexts: the value that changes, and the actions that never do ----------------
const CountContext = createContext(0)
const ActionsContext = createContext<(() => void) | null>(null)

function useRenderCount(kind: Kind) {
  // No dependency array: runs after EVERY commit of this component.
  useEffect(() => {
    renders[kind]++
  })
}

function CombinedConsumer({ kind }: { kind: "inline" | "memo" }) {
  const { increment } = useContext(CombinedContext)!
  useRenderCount(kind)
  return <li data-fn={increment.name}>c</li>
}
function SplitConsumer() {
  const increment = useContext(ActionsContext)!
  useRenderCount("split")
  return <li data-fn={increment.name}>c</li>
}
function SplitCountDisplay() {
  return <p>count: {useContext(CountContext)}</p>
}

const Controls = ({
  onTick,
  onNoise,
}: {
  onTick: () => void
  onNoise: () => void
}) => (
  <div className="flex gap-2">
    <button className="border p-1" onClick={onTick}>
      Tick (context value changes)
    </button>
    <button className="border p-1" onClick={onNoise}>
      Unrelated provider re-render
    </button>
  </div>
)

/** A: the mistake. `value={{ ... }}` is a NEW object on every provider render. */
function InlineProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0)
  const [, setNoise] = useState(0)
  const increment = () => setCount((c) => c + 1)
  return (
    <CombinedContext value={{ count, increment }}>
      <p>count: {count}</p>
      <Controls onTick={increment} onNoise={() => setNoise((n) => n + 1)} />
      {children}
    </CombinedContext>
  )
}

/** B: memoized value. Survives unrelated renders, but still changes on every tick. */
function MemoProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0)
  const [, setNoise] = useState(0)
  const increment = useMemo(() => () => setCount((c) => c + 1), [])
  const value = useMemo(() => ({ count, increment }), [count, increment])
  return (
    <CombinedContext value={value}>
      <p>count: {count}</p>
      <Controls onTick={increment} onNoise={() => setNoise((n) => n + 1)} />
      {children}
    </CombinedContext>
  )
}

/** C: split. The 50 consumers subscribe to the stable actions context only. */
function SplitProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0)
  const [, setNoise] = useState(0)
  const increment = useMemo(() => () => setCount((c) => c + 1), [])
  return (
    <ActionsContext value={increment}>
      <CountContext value={count}>
        <SplitCountDisplay />
        <Controls onTick={increment} onNoise={() => setNoise((n) => n + 1)} />
      </CountContext>
      {/* `children` is created by the Lab, outside the CountContext provider. */}
      {children}
    </ActionsContext>
  )
}

const fifty = Array.from({ length: 50 }, (_, i) => i)
// Created ONCE at module level: the same element objects every time, so React can skip them
// when only the provider (their parent) re-renders. Only a context change reaches them.
const consumers = {
  inline: fifty.map((i) => <CombinedConsumer key={i} kind="inline" />),
  memo: fifty.map((i) => <CombinedConsumer key={i} kind="memo" />),
  split: fifty.map((i) => <SplitConsumer key={i} />),
}

const Flavour = memo(function Flavour({ kind }: { kind: Kind }) {
  const Provider =
    kind === "inline"
      ? InlineProvider
      : kind === "memo"
        ? MemoProvider
        : SplitProvider
  return (
    <Provider>
      <ul className="sr-only">{consumers[kind]}</ul>
    </Provider>
  )
})

export function ContextLab() {
  const [kind, setKind] = useState<Kind>("inline")
  const [shown, setShown] = useState<Record<Kind, number>>({ ...renders })
  return (
    <section className="grid gap-2">
      <h2 className="font-medium">Context re-render problem (50 consumers)</h2>
      <div className="flex gap-2">
        {(["inline", "memo", "split"] as const).map((k) => (
          <button
            key={k}
            aria-pressed={kind === k}
            className="border p-1 aria-pressed:bg-neutral-200"
            onClick={() => {
              renders.inline = renders.memo = renders.split = 0
              setShown({ ...renders })
              setKind(k)
            }}
          >
            {k === "inline"
              ? "A: inline value"
              : k === "memo"
                ? "B: memoized value"
                : "C: split state/actions"}
          </button>
        ))}
      </div>
      {/* `key` remounts the flavour so each experiment starts from a clean count. */}
      <Flavour key={kind} kind={kind} />
      <div className="flex items-center gap-2">
        <button className="border p-1" onClick={() => setShown({ ...renders })}>
          Read committed consumer renders
        </button>
        <output data-testid="render-counts">
          inline {shown.inline} / memo {shown.memo} / split {shown.split}
        </output>
      </div>
    </section>
  )
}
