import { useState } from "react"

import { useDebounce } from "@/hooks/useDebounce"

/** Each instance has its own state AND its own timer: hooks share logic, not state. */
function DebouncedInput({ name }: { name: string }) {
  const [text, setText] = useState("")
  const debounced = useDebounce(text, 500)
  return (
    <label className="block text-sm">
      {name}{" "}
      <input
        className="border p-1"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <span data-testid={`debounced-${name}`}> debounced: {debounced}</span>
    </label>
  )
}

export function DebounceDemo() {
  return (
    <section className="border p-3">
      <h3 className="font-medium">
        useDebounce (500 ms), two independent users
      </h3>
      <DebouncedInput name="A" />
      <DebouncedInput name="B" />
    </section>
  )
}
