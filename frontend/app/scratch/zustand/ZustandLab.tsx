// 8.3: selectors decide who re-renders. Render counts are committed renders (module counter
// bumped in an effect), read with a button, like ContextLab. The badges are `memo`ed so the
// lab's own re-render (the read button) does not count: only STORE changes reach them.
import { memo, useEffect, useState } from "react"
import { useShallow } from "zustand/react/shallow"

import { useCartStore } from "@/features/cart"

import { BrokenSelector } from "./BrokenSelector"

const renders = { good: 0, smelly: 0, shallow: 0 }
const useCount = (kind: keyof typeof renders) =>
  useEffect(() => {
    renders[kind]++
  })

/** GOOD: a primitive. Re-renders only when the number of lines changes. */
const GoodBadge = memo(function GoodBadge() {
  const count = useCartStore((s) => s.lines.length)
  useCount("good")
  return <span>good: {count}</span>
})

/** SMELL: no selector = subscribed to the WHOLE store (drawerOpen included). */
const SmellyBadge = memo(function SmellyBadge() {
  const { lines } = useCartStore()
  useCount("smelly")
  return <span>smelly: {lines.length}</span>
})

/** An object/array selection is fine with `useShallow` (compares the fields, not the object). */
const ShallowBadge = memo(function ShallowBadge() {
  const { count, firstSku } = useCartStore(
    useShallow((s) => ({ count: s.lines.length, firstSku: s.lines[0]?.sku }))
  )
  useCount("shallow")
  return (
    <span>
      shallow: {count} {firstSku}
    </span>
  )
})

const DEMO = {
  sku: "LAB-1",
  productId: "lab-1",
  slug: "lab",
  name: "Lab item",
  imageUrl: "/placeholder.svg",
  unitPrice: 10_000,
  stock: 99,
}

export function ZustandLab({ broken }: { broken: boolean }) {
  const [shown, setShown] = useState({ ...renders })
  return (
    <section className="grid gap-2">
      <h2 className="font-medium">Zustand selectors (cart store)</h2>
      <div className="flex gap-3">
        <GoodBadge />
        <SmellyBadge />
        <ShallowBadge />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="border p-1"
          onClick={() => useCartStore.getState().toggleDrawer()}
        >
          Toggle drawer flag
        </button>
        <button
          className="border p-1"
          onClick={() => useCartStore.getState().add(DEMO, 1)}
        >
          Add lab item
        </button>
        <button
          className="border p-1"
          onClick={() => useCartStore.getState().remove(DEMO.sku)}
        >
          Remove lab item
        </button>
        <button className="border p-1" onClick={() => setShown({ ...renders })}>
          Read committed renders
        </button>
        <output data-testid="zustand-counts">
          good {shown.good} / smelly {shown.smelly} / shallow {shown.shallow}
        </output>
      </div>
      {broken && <BrokenSelector />}
    </section>
  )
}
